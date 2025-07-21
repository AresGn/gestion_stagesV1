import {
  UserIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline'; // Chemin mis à jour pour Heroicons v2

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const navItems = [
  { id: 'infos', label: 'Mon Profil', icon: UserIcon },
  { id: 'stage', label: 'Informations de Stage', icon: BriefcaseIcon },
  { id: 'find', label: 'Trouver un Stage', icon: MagnifyingGlassIcon },
  { id: 'projets', label: 'Projets', icon: ClipboardDocumentListIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
];

const Sidebar = ({ activeTab, setActiveTab, handleLogout, isSidebarOpen, toggleSidebar }: SidebarProps) => {
  return (
    <>
      {/* Overlay pour fermer la sidebar en cliquant à côté sur mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside 
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-gray-800 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo et titre */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">IS</span>
          </div>
          <h1 className="text-xl font-semibold">INSTI Stages</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isSidebarOpen) toggleSidebar(); // Fermer la sidebar après sélection sur mobile
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 