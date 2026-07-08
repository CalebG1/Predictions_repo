import { describe, expect, it } from "vitest";
import { parseIpynbJson, parsePythonFile, titleFromFilename } from "./notebookImport";

describe("notebookImport", () => {
  it("parses a python file into one code cell", () => {
    const cells = parsePythonFile('print("hi")\n');
    expect(cells).toHaveLength(1);
    expect(cells[0].kind).toBe("code");
    expect(cells[0].source).toBe('print("hi")');
  });

  it("parses ipynb markdown and code cells", () => {
    const cells = parseIpynbJson(
      JSON.stringify({
        cells: [
          { cell_type: "markdown", source: "# Title\n" },
          {
            cell_type: "code",
            source: ["print(1)\n"],
            outputs: [{ output_type: "stream", name: "stdout", text: "1\n" }],
          },
        ],
      })
    );
    expect(cells).toHaveLength(2);
    expect(cells[0].kind).toBe("markdown");
    expect(cells[1].kind).toBe("code");
    expect(cells[1].output).toBe("1");
    expect(cells[1].status).toBe("success");
  });

  it("derives a title from the filename", () => {
    expect(titleFromFilename("base_rate_check.ipynb")).toBe("base rate check");
    expect(titleFromFilename("model.py")).toBe("model");
  });
});
