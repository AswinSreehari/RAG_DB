

export const fetchGitHubProjects = async (owner, repo) => {
  try {
    // 1. Fetch Repository Details
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoResponse.ok) throw new Error('Failed to fetch repo details');
    const repoData = await repoResponse.json();

    const defaultBranch = repoData.default_branch;
    const lastModifiedDate = new Date(repoData.pushed_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const userCount = repoData.subscribers_count || repoData.watchers_count;

    // 2. Fetch Full Recursive Tree
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    if (!treeResponse.ok) throw new Error('Failed to fetch tree');
    const treeData = await treeResponse.json();

    // 3. Process Tree
    // Generic Logic: Treat any root-level item (folder or file) as a project
    const items = [];
    const folderFileCounts = {};

    treeData.tree.forEach(item => {
        // Pre-calculate file counts for folders
        if (item.type === 'blob' && item.path.includes('/')) {
            const rootFolder = item.path.split('/')[0];
            folderFileCounts[rootFolder] = (folderFileCounts[rootFolder] || 0) + 1;
        }
    });

    treeData.tree.forEach(item => {
        // Filter out hidden files and meta files
        if (!item.path.startsWith('.') && item.path !== 'README.md' && item.path !== 'LICENSE') {
             // Check if it is a root level item
             if (!item.path.includes('/')) {
                 let fileCount = 0;
                 if (item.type === 'tree') {
                     // It's a folder, use calculated count
                     fileCount = folderFileCounts[item.path] || 0;
                 } else {
                     // It's a file
                     fileCount = 1;
                 }

                 items.push({
                     name: item.path,
                     type: item.type,
                     fileCount: fileCount
                 });
             }
        }
    });

    // 4. Map to Project Schema
    const projects = items.map((item, index) => ({
        id: index + 1,
        title: item.name,
        files: item.fileCount, 
        users: userCount, 
        lastModified: lastModifiedDate,
        active: false,
        link: item.type === 'tree' 
            ? `https://github.com/${owner}/${repo}/tree/${defaultBranch}/${item.name}`
            : `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${item.name}`
    }));

    return projects;
  } catch (error) {
    console.error("Error fetching GitHub projects:", error);
    return [];
  }
};

