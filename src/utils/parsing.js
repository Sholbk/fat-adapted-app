export function fmt(d) { return d.toISOString().split("T")[0]; }
export function today() { return fmt(new Date()); }

export function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key) => {
      const m = block.match(new RegExp(`^${key}[^:]*:(.+)`, "m"));
      return m ? m[1].trim() : "";
    };
    const unfolded = block.replace(/\r?\n[ \t]/g, "");
    const getU = (key) => {
      const m = unfolded.match(new RegExp(`^${key}[^:]*:(.+)`, "m"));
      return m ? m[1].trim() : "";
    };
    const summary = getU("SUMMARY").replace(/\\\\/g, "\\").replace(/\\,/g, ",").replace(/\\"/g, '"');
    const desc = getU("DESCRIPTION").replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\").replace(/\\"/g, '"');
    const dtRaw = get("DTSTART");
    const dm = dtRaw.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dm) continue;
    const date = `${dm[1]}-${dm[2]}-${dm[3]}`;
    const durM = desc.match(/Duration:\s*([^\n]+)/);
    events.push({ date, summary, description: desc, duration: durM ? durM[1].trim() : "" });
  }
  return events;
}
