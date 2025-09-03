import { Bookmark, FileText, Settings, LogOut, X } from "lucide-react";

const MobileSidebar = ({ setShowSidebar }) => {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/10" onClick={() => setShowSidebar(false)}></div>
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* User Profile */}
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-3xl">👤</span>
            <div>
              <h3 className="font-medium text-slate-900">Shaheer Mansoor</h3>
              <p className="text-sm text-slate-600">shaheer.mansoor@email.com</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 mb-8">
            <a href="#" className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bookmark className="w-5 h-5" />
              <span>Saved Posts</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <FileText className="w-5 h-5" />
              <span>My Posts</span>
            </a>
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <a href="#" className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
