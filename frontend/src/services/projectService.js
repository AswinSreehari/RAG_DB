export const getProjects = async () => {
    try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const apiToken = import.meta.env.VITE_API_TOKEN;

        console.log(`Fetching projects from ${backendUrl}...`);

        const response = await fetch(`${backendUrl}/api/projects`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Backend API Error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch projects from backend:", error);
        return [];
    }
};

export default {
    getProjects
};
