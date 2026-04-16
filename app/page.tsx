import { redirect } from "next/navigation";

export default function Home() {
  redirect("/bar-results");
}
