import { Router } from "express";
import passport from "../auth/google.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false,
  }),
  (req, res) => {
    const user = req.user as {
      id: string;
      email: string;
      name: string | null;
      picture: string | null;
    };

    const params = new URLSearchParams({
      id: user.id,
      email: user.email,
      name: user.name || "",
      picture: user.picture || "",
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`
    );
  }
);

export default router;