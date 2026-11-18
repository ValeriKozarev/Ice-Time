import "./App.css";
import { useScrapeResult } from "./hooks/useScrapeResult";
import WeekView from "./components/WeekView";

function App() {
  // call our custom hook to load the data, it also handles state
  const state = useScrapeResult();
  
  if (state.status === "loading") {
    return <p>Loading...</p>;
  }
  else if (state.status === "error") {
    return <p>Error: {state.message}</p>;
  }

  return <WeekView scrapedAt={state.data.scrapedAt} sessions={state.data.sessions} />;
}

export default App;
