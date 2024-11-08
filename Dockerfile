FROM node:22.9.0-alpine AS base


# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* ./
# important, must use --production=false to include typescript from devDependencies for path aliases
RUN yarn install --production=false --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner

RUN apk add --no-cache dcron libcap
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next /app/data
RUN chown nextjs:nodejs .next /app/data

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/data /app/data

# crontab file
COPY --from=builder --chown=nextjs:nodejs /app/crontab /etc/crontab/nextjs
RUN chmod 0644 /etc/crontab/nextjs

# log file
RUN touch /var/log/cron.log
RUN chmod 0775 /var/log/cron.log
RUN chown nextjs:nodejs /var/log/cron.log

# exec file permissions
RUN chmod +x /usr/sbin/crond
# run crond and non-root user
RUN chown nextjs:nodejs /usr/sbin/crond
RUN setcap cap_setgid=ep /usr/sbin/crond

USER nextjs

EXPOSE 3007
ENV PORT=3007

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD /usr/sbin/crond -f -l 2 & node server.js