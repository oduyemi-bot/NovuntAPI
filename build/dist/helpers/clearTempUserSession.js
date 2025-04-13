"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTempUserSession = clearTempUserSession;
function clearTempUserSession(req) {
    delete req.session.tempUser;
    delete req.session.lastTOTPResend;
}
