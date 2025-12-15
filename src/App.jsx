import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import ProjectsWidget from './components/dashboard/ProjectsWidget';
import DocumentGeneratorWidget from './components/dashboard/DocumentGeneratorWidget';
import ChatAssistantWidget from './components/dashboard/ChatAssistantWidget';
import StakeholderOwnershipWidget from './components/dashboard/StakeholderOwnershipWidget';
import ProjectDetailsWidget from './components/dashboard/ProjectDetailsWidget';
import ProjectView from './components/project/ProjectView';

function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <Layout>
      {selectedProject ? (
        <ProjectView
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      ) : (
        <div className="flex flex-col gap-6 h-full pb-2">
          {/* Top Row: Projects + Doc Generator */}
          <div className="flex-[3] flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
            {/* Projects: Wider */}
            <div className="flex-[2] h-full overflow-hidden">
              <ProjectsWidget onProjectClick={(project) => setSelectedProject(project)} />
            </div>

            {/* Doc Generator: Narrower */}
            <div className="flex-1 h-full overflow-hidden">
              <DocumentGeneratorWidget />
            </div>
          </div>

          {/* Bottom Row: 3 Widgets */}
          <div className="flex-[2] min-h-[250px] grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <ChatAssistantWidget />
            <StakeholderOwnershipWidget />
            <ProjectDetailsWidget />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
