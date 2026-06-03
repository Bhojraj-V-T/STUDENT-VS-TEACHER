import { createFileRoute } from "@tanstack/react-router";
import EscapeTheTeacher from "@/components/EscapeTheTeacher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escape the Teacher — A* AI Chase Game" },
      { name: "description", content: "Collect assignment pages and reach the submission desk before the AI teacher catches you. Powered by A* pathfinding." },
      { property: "og:title", content: "Escape the Teacher" },
      { property: "og:description", content: "A grid game where the teacher uses A* pathfinding to chase you." },
    ],
  }),
  component: Index,
});

function Index() {
  return <EscapeTheTeacher />;
}
