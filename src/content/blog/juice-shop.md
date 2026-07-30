---
title: 'Juice Shop and Cybersec'
date: 2026-06-18
---

Cybersecurity is a suspicious thing to study, especially the practical side of it. But hands-on is how it actually sticks.

So instead of reading about it I set up a "sandbox" and ran a session with a few colleagues around [OWASP Juice Shop](https://juice-shop.github.io/juice-shop/). Probably the most modern and sophisticated **insecure** web application.

## Exposing

Juice Shop is a playground for vulnerabilities disguised as an e-commerce store. Running the docker image (`bkimminich/juice-shop`) locally is as easy as can be. Sharing it is something else.

Opening any website to the web comes with its challenges, more so an app that's intentionally full of holes.

When considering the options I ended up with these constraints: It had to be a short, one time session where up to 10 people could poke at it, and, ideally, free. To satisfy these constraits, and, learn something new, _Cloudflare Tunnels_ was the answer.

$$
\text{Internet} \rightarrow \overbrace{\text{Access}+\text{Tunnel}}^{\text{Cloudflare}} \rightarrow \text{Laptop}
$$

No "free hosting", credit cards, VPS. Full control with much better limits. Plus Cloudflare Access handles authentication at the edge before a request ever reaches the tunnel, so even an unpatched, deliberately-vulnerable app never gets an unauthenticated packet near it.

Good enough for a controlled session. Safe? Most certainly not.

## Off to the races

Juice Shop has dozens of challenges. On the easy end, viewing someone else's shopping cart: increment the id in `/rest/basket/:id`, no login required for the leak.

Basic login SQL injection, `' OR 1=1--` in the email field, gets the admin account in one line. From there it escalates to a UNION-based injection in the product search that dumps the entire user table, as long as the column count matches.

Some challenges lean on OSINT rather than code. Resetting a specific user's password just means digging up the answer to their security question on their own social media.

Others lean on obscurity, such as unprotected urls that are not linked anywhere in the UI. At times exposing one route leads to many others.

Happily, the app let's us do XSS! Interestingly stored XSS, which is essentially:

<a target="blank"
href="https://mermaid.live/edit#pako:eNptkkGLwjAQhf9KmLNK29R2zUFYt5c9uAiCLEsvIR1r0CbuJF3WFf_7RktFpDllZr73XkhyBmUrBAEOv1s0Cgsta5JNSaVhYR0lea30URrPXr2Xao80NFsj_QxPisVQd6OV1_eU3nk8n3dGgi3lIbC2dUF2OlhZ9WwHBLJYCLZCctp5x_wOn8Eu4sFyox_ZGgcdC-klk0qhc_28WIwfXFZdCiP0LRn3ZBLALlewd7NF5bEne_DDemQ2sKwHP9drhjCCmnQFwlOLI2iQGnkt4XyVlRAO3WAJImwrSfsSSnMJmnCZX9Y2vYxsW-9AbOXBhao9VtL3L3rvEpoK6c22xoPIpvHNBMQZfkHEWTxJeZ6lPOJJwqc8HcEptHk-SZM4miZJHiezLM8uI_i75UaTNIpmeRa_xBGPkpynQYKV9paW3c-6fbDLPz9cyLE">

![Stored XSS Diagram](https://mermaid.ink/img/pako:eNptkkGLwjAQhf9KmHOVtqmt5iCs28seXARBlqWXkI41aBM3SRdd8b9vtEREmlNm5nvvhSQXELpGYGDxp0MlsJS8MbytTKWIX0dunBTyyJUjb85xsUczNFuj-R2elIuh7kYKJx8pwXk0n_dGjCz5wbO6s152PmheB7YHPFkuGFmhsdI6S9wOX8E-4slyI5_ZBgcdS-444UKgtWFeLkZPLqs-hRh0nVH2xcSDfS4jH2qLwmEgA_ipHRLtWRLAr_Wa4AlF59BCBI2RNTBnOoygRdPyWwmXm7oCf_YWK2B-W3Ozr6BSV6_xd_qtdRtkRnfNDtiWH6yvumPNXXjYR9egqtG86045YPm0uJsAu8AJWJIn44wWeUZjmqZ0QrMIzr5Ni3GWJvEkTYskneVFfo3g754bj7M4nhV5Mk1iGqcFzbwEa-m0WfYf7P7Prv-dwcu7?type=png)
</a>

The stored XSS itself is very fun to see in action, and bypassing the app's own client-side guard against it. Juice Shop validates particular inputs in the frontend, which does nothing if the payload goes straight to the API.

Of course client-side checks are a UX feature, not a security boundary.

### CSRF, the one that fought back

The actual challenge here isn't the vulnerability, it's that modern browsers default to `SameSite=Lax` on cookies, which quietly blocks the "textbook" cross-site attack.

Getting a forged cross-origin form submission to actually work meant spinning up an older Firefox via Selenium `selenium/standalone-firefox:95.0`. A minimal `attack.html` auto-submitting a form to the profile endpoint did the rest:

```html
<form action="{url}/profile" method="POST">
    <input name="username" value="CSRF" />
    <input type="submit" />
</form>
<script>
    document.forms[0].submit()
</script>
```

The username changes with the "victim" never doing anything. This one took actual troubleshooting rather than following a known payload, which made it the most satisfying to land.

## Takeaways

About the tooling: Cloudflare tunnels are practical, lightweight, easy to setup and about the best way to use your hardware as a real server.

About the challenges: Ugly website, beautiful behavior. I highly encourage looking into the guide and poking around for yourself. The official companion guide is the way to go.

Final note: None of this required exotic tooling or deep expertise. The big takeaway is that small oversights stacked become real problems.

"Safety is a journey, not a destination" Always

[Docker image](https://hub.docker.com/r/bkimminich/juice-shop) .
[Companion guide](https://pwning.owasp-juice.shop/companion-guide/latest/) .
[OWASP's VWAD](https://vwad.owasp.org/)
