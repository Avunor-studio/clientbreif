import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const encoded = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.split("_")
  .slice(2)
  .join("_");
const host = Buffer.from(encoded, "base64").toString().split("$")[0];
const r = await fetch(`https://${host}/v1/environment`);
const data = await r.json();
const c = data.display_config || {};
console.log(
  JSON.stringify(
    {
      status: r.status,
      home: c.home_url,
      signIn: c.sign_in_url,
      signUp: c.sign_up_url,
      afterSignIn: c.after_sign_in_url,
      afterSignUp: c.after_sign_up_url,
    },
    null,
    2,
  ),
);
