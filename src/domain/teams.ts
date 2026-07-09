import type { User } from "./types";

export function userTeams(user: User): string[] {
  if (user.teams?.length) return user.teams;
  return [user.team];
}

export function userOnTeam(user: User, team: string): boolean {
  return user.role === "admin" || userTeams(user).includes(team);
}

export const orgTeams = [
  "Risk",
  "Executive",
  "Strategy",
  "Compliance",
  "Finance",
  "Operations",
  "Security",
  "Legal",
  "Product",
  "Corporate Strategy",
  "IT",
  "Real Estate",
];
