const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const appPath = path.join(root, 'src/App.jsx');
let source = fs.readFileSync(appPath, 'utf8');
if (!source.includes("from './pages/TravelerVisualDashboard'")) {
  source = "import TravelerVisualDashboard from './pages/TravelerVisualDashboard';\nimport TravelerVisualLayout from './pages/TravelerVisualLayout';\nimport './travel-visual.css';\n" + source;
}
if (!source.includes('function TravelVisualScope')) {
  source = source.replace('export default function App()', `function TravelVisualScope() {
  const { pathname } = useLocation();
  useEffect(() => {
    const protectedArea = /^\\/(admin|guide)(\\/|$)/.test(pathname) || /^\\/dashboard\\/(admin|guide)(\\/|$)/.test(pathname);
    document.body.dataset.travelVisual = protectedArea ? 'off' : /^\\/account(\\/|$)/.test(pathname) ? 'account' : 'public';
    return () => { delete document.body.dataset.travelVisual; };
  }, [pathname]);
  return null;
}
export default function App()`);
  source = source.replace(/return\s*<Routes>/, 'return <><TravelVisualScope /><Routes>');
  const end = source.lastIndexOf('</Routes>;');
  if (end < 0) throw new Error('Unsupported App.jsx closing structure. No changes written.');
  source = source.slice(0, end) + source.slice(end).replace('</Routes>;', '</Routes></>;');
}
const hasAccount = /path\s*=\s*["']\/account["']/.test(source);
if (hasAccount) {
  if (!source.includes('<TravelerVisualDashboard />')) {
    const match = source.match(/import\s+(\w+)\s+from\s+['"]([^'"]*AccountOverview)['"]/);
    if (!match) throw new Error('Existing account overview not recognized. No changes written: preserve your App.jsx and replace only the account index element with TravelerVisualDashboard.');
    const element = new RegExp('<' + match[1] + '\\s*/>','g');
    source = source.replace(element, '<TravelerVisualDashboard />');
  }
} else {
  const marker = '<Route path="*" element={<PublicShell>';
  if (!source.includes(marker)) throw new Error('PublicShell marker not recognized. No changes written.');
  const account = `<Route path="/account" element={<ProtectedRoute roles={['traveler']} />}><Route element={<TravelerVisualLayout />}><Route index element={<TravelerVisualDashboard />} /><Route path="trips" element={<MyBookings />} /><Route path="wishlist" element={<EmptyState title="Wishlist is not installed in this source" message="Your existing wishlist implementation is preserved when available. Browse tours to find your next journey." />} /><Route path="profile" element={<EmptyState title="Profile settings are not installed in this source" message="This visual patch does not create profile or settings APIs." />} /></Route></Route>\n    `;
  source = source.replace(marker, account + marker);
  source = source.replace('path="/dashboard/traveler" element={<Dashboard />}', 'path="/dashboard/traveler" element={<Navigate to="/account" replace />}');
}
if (source === fs.readFileSync(appPath,'utf8')) { console.log('Visual routing already installed.'); }
else {
  const backup = appPath + '.before-travel-visual';
  if (!fs.existsSync(backup)) fs.copyFileSync(appPath,backup);
  fs.writeFileSync(appPath, source);
  console.log('Updated App.jsx; original saved as App.jsx.before-travel-visual');
}
