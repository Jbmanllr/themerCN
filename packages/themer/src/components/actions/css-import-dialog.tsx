"use client";

// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified by Banter.
//
// Paste-a-stylesheet import. Inspired by tweakcn's css-import-dialog.tsx, with
// its regex parser (parse-css-input.ts: first `:root`/`.dark` block only, `[^}]`
// body match that a brace in a comment truncates) replaced by `parseThemeCss`.
// Parsing happens on submit, never per keystroke: a pasted stylesheet can be
// large and the user is not done typing until they press Import. The result is
// applied through the editor store (one undo entry, checkpoint, HSL reset), so
// the dialog owns no theme state beyond its own form.
import * as React from "react";
import { AlertCircle, Check } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEditorStore } from "../../stores/editor-store";
import { parseThemeCss, type ParsedThemeCss } from "../../utils/parse-css";
import { getExtraColorKeys } from "../../config/extra-colors";

interface CssImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportOutcome =
  | { kind: "empty"; warnings: string[] }
  | {
      kind: "imported";
      light: number;
      dark: number;
      ignored: string[];
      warnings: string[];
    };

function summarize(parsed: ParsedThemeCss): ImportOutcome {
  const light = Object.keys(parsed.light).length;
  const dark = Object.keys(parsed.dark).length;
  if (light === 0 && dark === 0) {
    return { kind: "empty", warnings: parsed.warnings };
  }
  return {
    kind: "imported",
    light,
    dark,
    ignored: parsed.ignored,
    warnings: parsed.warnings,
  };
}

export function CssImportDialog({ open, onOpenChange }: CssImportDialogProps) {
  const [css, setCss] = React.useState("");
  const [replace, setReplace] = React.useState(false);
  const [outcome, setOutcome] = React.useState<ImportOutcome | null>(null);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // A closed dialog starts blank next time: a stale summary of a previous
      // paste would read as the result of the new one.
      if (!next) {
        setCss("");
        setReplace(false);
        setOutcome(null);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const parsed = parseThemeCss(css, {
        extraColorKeys: getExtraColorKeys(),
      });
      const next = summarize(parsed);
      if (next.kind === "imported") {
        useEditorStore
          .getState()
          .importThemeStyles(
            { light: parsed.light, dark: parsed.dark },
            { replace },
          );
      }
      setOutcome(next);
    },
    [css, replace],
  );

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCss(event.target.value);
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        data-testid="themer-css-import-dialog"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Import CSS</DialogTitle>
            <DialogDescription>
              Paste a stylesheet with :root and .dark variables (shadcn, tweakcn
              or Tailwind v3/v4). Colours keep the format you paste.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={css}
            onChange={handleChange}
            placeholder={
              ":root {\n  --background: oklch(1 0 0);\n}\n\n.dark {\n  --background: oklch(0.145 0 0);\n}"
            }
            spellCheck={false}
            autoComplete="off"
            aria-label="CSS to import"
            data-testid="themer-css-import-input"
            className="field-sizing-fixed h-72 max-h-[50dvh] resize-none overflow-auto font-mono text-xs"
          />

          <Field orientation="horizontal">
            <Switch
              id="themer-css-import-replace"
              checked={replace}
              onCheckedChange={setReplace}
              data-testid="themer-css-import-replace"
            />
            <FieldLabel htmlFor="themer-css-import-replace">
              Replace tokens not in this CSS
            </FieldLabel>
          </Field>

          {outcome?.kind === "empty" ? (
            <Alert variant="destructive" data-testid="themer-css-import-empty">
              <AlertCircle />
              <AlertTitle>Nothing to import</AlertTitle>
              <AlertDescription>
                No theme variables found under :root, html or .dark. Check that
                the variables start with -- and sit in those blocks.
              </AlertDescription>
            </Alert>
          ) : null}

          {outcome?.kind === "imported" ? (
            <Alert data-testid="themer-css-import-result">
              <Check />
              <AlertTitle>
                {outcome.light} light · {outcome.dark} dark tokens imported,{" "}
                {outcome.ignored.length} ignored
              </AlertTitle>
              {outcome.ignored.length > 0 ? (
                <AlertDescription>
                  <span className="break-words">
                    Ignored: {outcome.ignored.join(", ")}
                  </span>
                </AlertDescription>
              ) : null}
            </Alert>
          ) : null}

          {outcome && outcome.warnings.length > 0 ? (
            <Alert data-testid="themer-css-import-warnings">
              <AlertCircle />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-0.5 ps-4">
                  {outcome.warnings.map((warning) => (
                    <li key={warning} className="break-words">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {outcome?.kind === "imported" ? "Close" : "Cancel"}
            </DialogClose>
            <Button type="submit" disabled={css.trim() === ""}>
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
