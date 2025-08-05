import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// Environment variable for the knowledge base ID
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;

// This is a server-to-server route, so it doesn't need the `request` object.
export async function GET() {
  try {
    // 1. Authenticate on the server. This is the crucial step.
    const authHeaders = await getStackAiApiAuthHeaders();

    // First, get the knowledge base details to see which resources are actually indexed
    const kbDetailsUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const kbDetailsResponse = await fetch(kbDetailsUrl, {
      method: 'GET',
      headers: authHeaders,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!kbDetailsResponse.ok) {
      if (kbDetailsResponse.status === 404) {
        return NextResponse.json([]);
      }
      throw new Error(`Failed to fetch knowledge base details: ${kbDetailsResponse.statusText}`);
    }
    
    const kbDetails = await kbDetailsResponse.json();
    const indexedResourceIds = kbDetails.connection_source_ids || [];
    
    console.log('Indexed resource IDs:', indexedResourceIds);
    
    // If no resources are indexed, return empty array
    if (indexedResourceIds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get all resources from the knowledge base
    const params = new URLSearchParams({ resource_path: '/' });
    const kbResourcesUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}/resources/children?${params}`;
    
    const kbResourcesResponse = await fetch(kbResourcesUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!kbResourcesResponse.ok) {
      if (kbResourcesResponse.status === 404) {
        return NextResponse.json([]);
      }
      throw new Error(`Failed to fetch knowledge base resources: ${kbResourcesResponse.statusText}`);
    }
    
    const kbData = await kbResourcesResponse.json();
    const allResources = kbData.data || [];
    
    // Filter resources to only include those that are actually in the indexed list
    // AND are actually available in the knowledge base (not just queued)
    const filteredResources = allResources.filter((r: { resource_id: string }) => 
      indexedResourceIds.includes(r.resource_id)
    );
    
    console.log(`Found ${filteredResources.length} actually indexed resources out of ${allResources.length} total resources`);
    
    // Separate files and folders
    const files = filteredResources.filter((r: { inode_type: string }) => r.inode_type === 'file');
    const folders = filteredResources.filter((r: { inode_type: string }) => r.inode_type === 'directory');
    
    // For each folder, try to get its contents and add the folder path to the files
    const organizedResources = [...files]; // Start with root-level files
    
    for (const folder of folders) {
      try {
        const folderParams = new URLSearchParams({ resource_path: `/${folder.inode_path.path}` });
        const folderUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}/resources/children?${folderParams}`;
        
        const folderResponse = await fetch(folderUrl, {
          method: 'GET',
          headers: authHeaders,
        });
        
        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          const folderFiles = folderData.data || [];
          
          // Only include files that are actually indexed
          const indexedFolderFiles = folderFiles.filter((file: { resource_id: string }) => 
            indexedResourceIds.includes(file.resource_id)
          );
          
          // Add folder path to each file in this folder
          const filesWithPath = indexedFolderFiles.map((file: { resource_id: string; inode_path: { path: string } }) => ({
            ...file,
            inode_path: {
              ...file.inode_path,
              path: `${folder.inode_path.path}/${file.inode_path.path.split('/').pop()}`
            }
          }));
          
          organizedResources.push(...filesWithPath);
        }
      } catch (error) {
        console.warn(`Failed to fetch contents of folder ${folder.inode_path.path}:`, error);
        // Still include the folder itself if it's indexed
        if (indexedResourceIds.includes(folder.resource_id)) {
          organizedResources.push(folder);
        }
      }
    }

    console.log(`Returning ${organizedResources.length} organized resources`);
    return NextResponse.json(organizedResources);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Failed to fetch indexed resources:', message);
    return NextResponse.json({ message }, { status: 500 });
  }
} 