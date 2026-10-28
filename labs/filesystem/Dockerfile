FROM node:22-alpine
WORKDIR /app
ARG ISU=311553
RUN [ "${#ISU}" -eq 6 ] && printf '%s' "$ISU" | grep -Eq '^[0-9]{6}$' || { echo 'Supply your six-digit ISU using --build-arg ISU=...' >&2; exit 1; }; printf '%s\n' "$ISU" > isu.txt
COPY analyze.mjs index.mjs ./
CMD ["node", "index.mjs"]
