import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// Environment variable for the knowledge base ID
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;

// This is a server-to-server route, so it doesn't need the `request` object.
export async function GET() {
  try {
    // 1. Authenticate on the server.
    const authHeaders = await getStackAiApiAuthHeaders();

    // 2. Get the knowledge base details to find out what was *supposed* to be indexed.
    const kbDetailsUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`;
    const kbDetailsResponse = await fetch(kbDetailsUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!kbDetailsResponse.ok) {
      if (kbDetailsResponse.status === 404) return NextResponse.json([]);
      throw new Error(`Failed to fetch knowledge base details: ${kbDetailsResponse.statusText}`);
    }
    
    const kbDetails = await kbDetailsResponse.json();
    // This Set contains the IDs of all top-level files and folders the user added.
    const sourceIds = new Set(kbDetails.connection_source_ids || []);
    
    if (sourceIds.size === 0) {
      return NextResponse.json([]);
    }
    
    // 3. Get ALL resources that are *currently available* in the knowledge base.
    // This will include files that were indexed as part of a folder sync.
    const kbResourcesUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}/resources/children?${new URLSearchParams({ resource_path: '/' })}`;
    const kbResourcesResponse = await fetch(kbResourcesUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!kbResourcesResponse.ok) {
      if (kbResourcesResponse.status === 404) return NextResponse.json([]);
      throw new Error(`Failed to fetch knowledge base resources: ${kbResourcesResponse.statusText}`);
    }
    
    const kbData = await kbResourcesResponse.json();
    const allAvailableResources = kbData.data || [];
    
    // 4. Intelligently build the final list of resources.
    const finalResources = [];
    const topLevelFolders = [];

    // First pass: Find all top-level items that are supposed to be indexed.
    for (const resource of allAvailableResources) {
      if (sourceIds.has(resource.resource_id)) {
        finalResources.push(resource);
        if (resource.inode_type === 'directory') {
          topLevelFolders.push(resource);
        }
      }
    }

    // Second pass: For each indexed folder, fetch its children and add them to the list.
    // This is the crucial step that was missing.
    for (const folder of topLevelFolders) {
      try {
        const folderParams = new URLSearchParams({ resource_path: `/${folder.inode_path.path}` });
        const folderUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}/resources/children?${folderParams}`;
        const folderResponse = await fetch(folderUrl, { method: 'GET', headers: authHeaders });
        
        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          const children = folderData.data || [];
          
          // Add the full parent path to each child for correct display
          const childrenWithPath = children.map((child: { resource_id: string; inode_path: { path: string }; inode_type: string; size?: number; status?: string; created_at?: string; modified_at?: string }) => ({
            ...child,
            inode_path: {
              ...child.inode_path,
              path: `${folder.inode_path.path}/${child.inode_path.path.split('/').pop()}`
            }
          }));
          
          // Add all children to the final list. They are indexed by association.
          finalResources.push(...childrenWithPath);
        }
      } catch (error) {
        console.warn(`Failed to fetch contents of folder ${folder.inode_path.path}:`, error);
      }
    }
    
    // Ensure the final list has no duplicates.
    const uniqueResources = Array.from(new Map(finalResources.map(item => [item.resource_id, item])).values());

    console.log(`Returning ${uniqueResources.length} organized and unique resources`);
    return NextResponse.json(uniqueResources);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Failed to fetch indexed resources:', message);
    return NextResponse.json({ message }, { status: 500 });
  }
} 