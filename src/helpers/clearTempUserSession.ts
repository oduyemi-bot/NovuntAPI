import { Request } from "express";


export function clearTempUserSession(req: Request) {
    delete req.session.tempUser;
    delete req.session.lastTOTPResend;
  }
  