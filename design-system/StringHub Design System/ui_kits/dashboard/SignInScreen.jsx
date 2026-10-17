(() => {
const { AuthShell, Field, Input, Button } = window.StringHubDesignSystem_90e1d8;
function SignInScreen({ onSignIn }) {
  return <AuthShell logoSrc="../../assets/stringhub-mark.svg" title="Sign in to StringHub" subtitle="Welcome back! Use your work email." foot={<>New here? <a href="#">Create an account</a></>}>
    <form className="stack" onSubmit={(e) => { e.preventDefault(); onSignIn(); }}>
      <Field label="Email" htmlFor="a-email"><Input id="a-email" type="email" placeholder="you@company.com" defaultValue="prem@acme.io" /></Field>
      <Field label="Password" htmlFor="a-pw" hint={<a href="#">Forgot password?</a>}><Input id="a-pw" type="password" defaultValue="password" /></Field>
      <Button type="submit" variant="primary" size="lg" style={{ width: "100%" }}>Sign in</Button>
      <div className="divider-text">or</div>
      <Button variant="secondary" size="lg" icon="globe" style={{ width: "100%" }}>Continue with Google</Button>
    </form>
  </AuthShell>;
}
window.SignInScreen = SignInScreen;
})();
