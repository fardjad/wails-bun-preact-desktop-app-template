import { useState } from "preact/hooks";
import { NavigationShell } from "./components/navigation-shell";
import { HomeView } from "./views/home-view";
import { SystemView } from "./views/system-view";

export type Route = "/" | "/system";

export function App() {
  const [route, setRoute] = useState<Route>("/");

  let view;
  switch (route) {
    case "/system":
      view = <SystemView />;
      break;
    default:
      view = <HomeView />;
  }

  return (
    <NavigationShell route={route} onNavigate={setRoute}>
      {view}
    </NavigationShell>
  );
}
