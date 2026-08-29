import { JyotishOrbit } from "./JyotishOrbit";

export default function Home() {
  return <JyotishOrbit initialDate={new Date().toISOString()} />;
}
