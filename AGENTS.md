# Project architecture rules

- AI brief actions return typed error results for expired sessions or provider failures, because thrown HTTP responses can escape TanStack server functions and blank the page.