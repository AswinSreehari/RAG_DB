const axios = require('axios');

const getProjects = async () => {
  const dataSourceType = process.env.DATA_SOURCE_TYPE;
  const dataSourceUrl = process.env.DATA_SOURCE_URL;

  if (dataSourceType === 'GITHUB') {
     return await fetchGitHubProjects(dataSourceUrl);
  }

  // Fallback or other sources
  return [];
};

const fetchGitHubProjects = async (url) => {
  try {
    // const parts = url.split('github.com/');
    // if (parts.length < 2) return [];
    // const [owner, repo] = parts[1].split('/');

    const cleanUrl = url.replace(/\.git$/, '').replace(/\/$/, '');
const parts = cleanUrl.split('github.com/')[1].split('/');
const owner = parts[0];
const repo = parts[1];


    if (!owner || !repo) return [];

    console.log(`Fetching projects for ${owner}/${repo}...`);

    // Setup headers with GitHub token if available
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch repository details to get default branch
    const repoDetailsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    const defaultBranch = repoDetailsResponse.data.default_branch;
 
    // Fetch the tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const treeResponse = await axios.get(treeUrl, { headers });
    
    if (!treeResponse.data || !treeResponse.data.tree) return [];

    const tree = treeResponse.data.tree;

    // Identify root-level items (folders and files)
    const rootItems = tree.filter(item => !item.path.includes('/'));

    const projects = rootItems
      .filter(item => {
        const name = item.path;
         // Filter out hidden files/folders and common config files
        return !name.startsWith('.') && 
               !['README.md', 'LICENSE', 'package.json', 'package-lock.json', 'node_modules'].includes(name);
      })
      .map(item => {
        let fileCount = 0;
        
        if (item.type === 'tree') {
             // Count files inside this folder
            fileCount = tree.filter(t => t.path.startsWith(item.path + '/') && t.type === 'blob').length;
        } else {
            fileCount = 1;
        }

        
        return {
          id: item.sha,
          name: item.path,
          status: 'Active',
          fileCount: fileCount,
          lastModified: new Date().toISOString().split('T')[0], // Default
          users: [], // Default
          type: item.type === 'tree' ? 'folder' : 'file'
        };
      });
       
    // Fetch dynamic metadata (Last Modified & Users)
    const projectsWithMetadata = await Promise.all(projects.map(async (project) => {
        try {
            const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${project.name}&per_page=5`;
            const commitsRes = await axios.get(commitsUrl, { headers });
            const commits = commitsRes.data;

            if (commits && commits.length > 0) {
                // Last Modified
                project.lastModified = commits[0].commit.committer.date.split('T')[0];
                
                // Users (unique authors from last 5 commits)
                const authors = new Set();
                commits.forEach(c => {
                    if (c.author && c.author.login) authors.add(c.author.login);
                    else if (c.commit.author.name) authors.add(c.commit.author.name);
                });
                project.users = Array.from(authors);
            }
        } catch (e) {
            console.warn(`Failed to fetch metadata for ${project.name}:`, e.message);
        }
        return project;
    }));

    return projectsWithMetadata;



  } catch (error) {
    console.error('Error fetching GitHub projects:', error.message);
    if (error.response && error.response.status === 404) {
        console.error("Repository not found or private.");
    }
    return [];
  }
};

module.exports = {
  getProjects
};
