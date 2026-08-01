import { Routes, Route } from "react-router-dom";
import { screens } from "@/screens";

export default function App() {
  return (
    <Routes>
      {screens.map(({ path, Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Routes>
  );
}
