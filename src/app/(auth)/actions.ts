"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || password.length < 8) {
    return null;
  }

  return { email: normalizedEmail, password };
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const credentials = readCredentials(formData);

  if (!credentials) {
    redirectWithMessage("/login", "Vérifiez votre courriel et votre mot de passe.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirectWithMessage("/login", "Courriel ou mot de passe incorrect.");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const credentials = readCredentials(formData);

  if (!credentials) {
    redirectWithMessage(
      "/signup",
      "Utilisez un courriel valide et un mot de passe d’au moins 8 caractères.",
    );
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : undefined,
  });

  if (error) {
    redirectWithMessage("/signup", "La création du compte a échoué. Réessayez.");
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  redirectWithMessage(
    "/login",
    "Compte créé. Consultez votre courriel pour confirmer votre inscription.",
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    redirectWithMessage(
      "/forgot-password",
      "Entre une adresse courriel valide.",
    );
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    origin
      ? { redirectTo: `${origin}/auth/confirm?next=/reset-password` }
      : undefined,
  );

  if (error) {
    console.error("Could not request password reset", error);
  }

  redirectWithMessage(
    "/forgot-password",
    "Si un compte correspond à ce courriel, un lien de récupération vient d’être envoyé.",
  );
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const passwordConfirmation = formData.get("passwordConfirmation");

  if (
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string" ||
    password.length < 8
  ) {
    redirectWithMessage(
      "/reset-password",
      "Le mot de passe doit contenir au moins 8 caractères.",
    );
  }

  if (password !== passwordConfirmation) {
    redirectWithMessage(
      "/reset-password",
      "Les deux mots de passe ne correspondent pas.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectWithMessage(
      "/login",
      "Le lien de récupération est invalide ou expiré.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithMessage(
      "/reset-password",
      "Le mot de passe n’a pas pu être modifié. Demande un nouveau lien.",
    );
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirectWithMessage(
    "/login",
    "Mot de passe modifié. Tu peux maintenant te connecter.",
  );
}
