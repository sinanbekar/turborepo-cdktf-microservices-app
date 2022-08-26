# Turborepo CDKTF Microservices App

Monorepo using serverless microservices design with `AWS Lambda` and `Amazon MQ (RabbitMQ)` for backend, 
Vercel for frontend (Next.js) with Terraform CDK infrastructure.

## What's inside?

This turborepo uses [pnpm](https://pnpm.io) as a packages manager. It includes the following packages/apps:

### Apps and Packages
- `csv-to-pdf-microservice`: a python microservice that converts csv to pdf with RabbitMQ & kombu (messaging library)
- `aggregation`: a Nestjs backend for frontend (Lambda function)
- `web`: [Next.js](https://nextjs.org) app
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

### Notes
- The infrastructure targets minimum cost (free) and does not include best practices for security. 
If you want to use it for large production you should create a VPC with private & public subnets with NAT Gateway 
(or VPC Endpoint PrivateLink) to establish a connection between API Gateway, Amazon MQ (set publicly accessible to false), STS, SecretsManager, and AWS Lambda. 
If you use VPC Endpoint (PrivateLink) for communication between these services, the traffic won't go on the public internet, 
it stays on AWS Network and this will help maximum security for your application.
- Besides requests between microservice and frontend, the file sharing between Lambdas is provided with a message queue. (we are working with files less than 100 KB, 
and for staying free tier)
You should not use a message queue for sharing file binary in large production, instead, you should use a reference path. For a serverless (AWS Lambda) environment,
you can use EFS or S3. You can find additional information in application code comments.

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## Setup

```bash
git clone https://github.com/sinanbekar/turborepo-cdktf-microservices-app
cd turborepo-cdktf-microservices-app
pnpm install
```

### Build

To build all apps and packages, run the following command:

```bash
pnpm run build
```

### Deployment

To deploy frontend to Vercel, backend to AWS (Lambda), first install cdktf-cli:

```bash
pnpm add --global cdktf-cli@latest
cd infrastructure/cdktf
cdktf get # generate constructs from hcl providers
```
Please make sure that set up these environment variables: `AWS_ACCESS_KEY_ID` `AWS_SECRET_ACCESS_KEY` and `VERCEL_API_TOKEN`

and deploy 🚀

```bash
cdktf deploy backend frontend
```

### Develop

To develop all apps and packages, run the following command:

```bash
pnpm run dev
```

## Useful Links

Learn more about Terraform and CDK for Terraform:
- [Official Guide Vercel and Terraform (HCL)](https://vercel.com/guides/integrating-terraform-with-vercel)
- [CDKTF Docs](https://www.terraform.io/cdktf)

Learn more about the power of Turborepo:

- [Pipelines](https://turborepo.org/docs/core-concepts/pipelines)
- [Caching](https://turborepo.org/docs/core-concepts/caching)
- [Remote Caching](https://turborepo.org/docs/core-concepts/remote-caching)
- [Scoped Tasks](https://turborepo.org/docs/core-concepts/scopes)
- [Configuration Options](https://turborepo.org/docs/reference/configuration)
- [CLI Usage](https://turborepo.org/docs/reference/command-line-reference)
