import fs from "fs";
import path from "path";

export function logAudit(message: string) {
  const logPath = path.join(__dirname, "../../logs/superadmin-audit.log");
  const logMessage = `${new Date().toISOString()} - ${message}\n`;

  fs.mkdirSync(path.dirname(logPath), { recursive: true }); 
  fs.appendFileSync(logPath, logMessage);
}
