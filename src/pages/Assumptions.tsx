import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { analystLibraryAssumptions } from "../domain/analystAssumptions";
import { useStore } from "../store";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export default function Assumptions() {
  const { questions, assumptionsFor } = useStore();
  const [query, setQuery] = useState("");
  const library = useMemo(
    () =>
      analystLibraryAssumptions.filter((item) =>
        `${item.name} ${item.note} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const platform = useMemo(
    () =>
      questions
        .flatMap((question) =>
          assumptionsFor(question.id).map((assumption) => ({
            ...assumption,
            question: question.title,
          })),
        )
        .filter((item) =>
          `${item.statement} ${item.question}`.toLowerCase().includes(query.toLowerCase()),
        ),
    [assumptionsFor, questions, query],
  );
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Signal Ridge reference data
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Assumptions</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            A shared register of assumptions used by forecasts and analyst workbooks.
          </p>
        </div>
        <Link
          className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          to="/analyst"
        >
          Open analyst workspace →
        </Link>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          [analystLibraryAssumptions.length, "Analyst library values"],
          [platform.length, "Platform forecast assumptions"],
          ["Read-only", "Database sync planned"],
        ].map(([value, label]) => (
          <Card key={String(label)}>
            <CardContent>
              <strong className="block text-2xl">{value}</strong>
              <span className="text-sm text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search assumptions"
      />
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Analyst assumption library
          </span>
          <CardTitle>Reference values for workbooks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assumption</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Definition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {library.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <strong>{item.name}</strong>
                    <small className="block text-muted-foreground">{item.id}</small>
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-primary">
                    {String(item.value)}
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-2 py-1 text-xs">{item.category}</span>
                  </TableCell>
                  <TableCell className="whitespace-normal">{item.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Forecast assumptions
          </span>
          <CardTitle>Existing platform assumptions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {platform.length ? (
            platform.map((item) => (
              <article
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                key={item.id}
              >
                <div>
                  <strong>{item.statement}</strong>
                  <p className="text-sm text-muted-foreground">{item.question}</p>
                </div>
                <span className="rounded bg-muted px-2 py-1 text-xs">
                  {item.confidence ?? "medium"}
                </span>
              </article>
            ))
          ) : (
            <p className="text-muted-foreground">No platform assumptions match this search.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
