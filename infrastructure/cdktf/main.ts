import { Construct } from "constructs";
import {
  App,
  TerraformOutput,
  TerraformStack,
  // Fn
} from "cdktf";
import * as path from "path";
import * as vercel from "./.gen/providers/vercel";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";

import {
  NodejsFunction,
  PythonPoetryFunction,
  NodejsFunctionProps,
  PythonPoetryFunctionProps,
} from "./lib/lambda/function";
import {
  nestEsBuildExternals,
  nestEsBuildNodeModules,
} from "../../bff/services/aggregation/util/esbuildOptions";

interface CommonStackConfig {
  region?: string;
}

type FrontendStackConfig = {
  apiUrl: string;
} & CommonStackConfig;

type BackendStackConfig = {
  queueName: string;
  bff: { function: Partial<NodejsFunctionProps> };
  python: { function: Partial<PythonPoetryFunctionProps> };
} & CommonStackConfig;

class BackendStack extends TerraformStack {
  public apiGw: aws.apigateway.ApiGatewayRestApi;
  public apiGwStage: aws.apigateway.ApiGatewayStage;
  constructor(scope: Construct, name: string, config: BackendStackConfig) {
    super(scope, name);

    const { region = "eu-central-1" } = config;

    new aws.AwsProvider(this, "Provider", {
      region: region,
    });

    new random.RandomProvider(this, "Random");

    const mqSecretName = new random.StringResource(this, "MqSecretName", {
      length: 10,
      special: false,
    });

    const mqUsername = new random.StringResource(this, "MqUsername", {
      length: 10,
      special: false,
    });

    const mqPassword = new random.Password(this, "MqPassword", {
      length: 20,
      special: false,
    });

    const secretsManager = new aws.secretsmanager.SecretsmanagerSecret(
      this,
      "SecretsManager",
      {
        name: mqSecretName.result,
      }
    );

    new aws.secretsmanager.SecretsmanagerSecretVersion(
      this,
      "SecretsManagerSecretVersion",
      {
        secretId: secretsManager.id,
        secretString: JSON.stringify({
          username: mqUsername.result,
          password: mqPassword.result,
        }),
      }
    );

    const mqBroker = new aws.mq.MqBroker(this, "RabbitMq", {
      brokerName: "MessageBroker",
      deploymentMode: "SINGLE_INSTANCE",
      engineType: "RabbitMQ",
      engineVersion: "3.9.16",
      hostInstanceType: "mq.t3.micro",
      autoMinorVersionUpgrade: true,
      publiclyAccessible: true,
      logs: { general: true },
      user: [
        {
          consoleAccess: true,
          username: mqUsername.result,
          password: mqPassword.result,
        },
      ],
    });

    const pet = new random.Pet(this, "RandomNameForRole", {
      length: 2,
    });

    const role = new aws.iam.IamRole(this, `LambdaRole`, {
      name: `LambdaRole-${name}-${pet.id}`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Effect: "Allow",
            Sid: "",
          },
        ],
      }),
    });

    new aws.iam.IamRolePolicyAttachment(this, "LambdaVpcAccessPolicy", {
      policyArn:
        "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
      role: role.name,
    });

    new aws.iam.IamRolePolicyAttachment(this, "LambdaEc2ReadOnly", {
      policyArn: "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess",
      role: role.name,
    });

    new aws.iam.IamRolePolicy(this, "LambdaMqPolicy", {
      role: role.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "secretsmanager:GetSecretValue",
            Resource: secretsManager.arn,
          },
          {
            Effect: "Allow",
            Action: "mq:DescribeBroker",
            Resource: mqBroker.arn,
          },
        ],
      }),
    });

    const bffLambdaFunction = new NodejsFunction(this, "BffLambdaFunction", {
      functionName: `bff-lambda-${pet.id}`,
      entry: config.bff.function.entry,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk", ...nestEsBuildExternals],
        nodeModules: nestEsBuildNodeModules,
        //forceDockerBundling: true, // enable if you add native module(s)
        // make sure that run build before deploy
        // see https://github.com/aws/aws-cdk/issues/19841
        //preCompilation: true,
        ...config.bff.function.bundling,
      },
      environment: {
        variables: {
          RABBITMQ_HOST: `amqps://${mqBroker.id}.mq.${region}.amazonaws.com:5671`,
          RABBITMQ_USER: mqUsername.result,
          RABBITMQ_PASSWORD: mqPassword.result,
          RABBITMQ_QUEUE_NAME: config.queueName,
        },
      },
      memorySize: 128,
      timeout: 30,
      role: role.arn,
      ...config.bff.function,
    });

    const backendLambdaFunction = new PythonPoetryFunction(
      this,
      "BackendLambdaFunction",
      {
        functionName: `backend-lambda-${pet.id}`,
        entry: config.python.function.entry as string,
        memorySize: 256,
        timeout: 30,
        s3Bucket: new aws.s3.S3Bucket(this, "BackendLambdaBucket", {
          bucketPrefix: `backendlambda`,
        }).bucket,
        // s3Key // generated automatically,
        environment: {
          variables: {
            RABBITMQ_HOST: `amqps://${mqBroker.id}.mq.${region}.amazonaws.com:5671`,
            RABBITMQ_USER: mqUsername.result,
            RABBITMQ_PASSWORD: mqPassword.result,
            RABBITMQ_QUEUE_NAME: config.queueName,
          },
        },

        role: role.arn,
        ...config.python.function,
      }
    );

    new aws.lambdafunction.LambdaEventSourceMapping(
      this,
      "BackendLambdaEventSourceMapping",
      {
        batchSize: 1,
        eventSourceArn: mqBroker.arn,
        enabled: true,
        functionName: backendLambdaFunction.arn,
        queues: [config.queueName],
        sourceAccessConfiguration: [
          { type: "VIRTUAL_HOST", uri: "/" },
          {
            type: "BASIC_AUTH",
            uri: secretsManager.arn,
          },
        ],
      }
    );

    this.apiGw = new aws.apigateway.ApiGatewayRestApi(this, "ApiGw", {
      name: name,
      endpointConfiguration: {
        types: ["REGIONAL"],
      },
      binaryMediaTypes: ["*/*"],
    });

    const apiGwProxy = new aws.apigateway.ApiGatewayResource(
      this,
      "ApiGwProxy",
      {
        restApiId: this.apiGw.id,
        parentId: this.apiGw.rootResourceId,
        pathPart: "{proxy+}",
      }
    );

    const apiGwProxyMethod = new aws.apigateway.ApiGatewayMethod(
      this,
      "ApiGwProxyMethod",
      {
        restApiId: this.apiGw.id,
        resourceId: apiGwProxy.id,
        authorization: "NONE",
        httpMethod: "ANY",
      }
    );

    const proxyIntegration = new aws.apigateway.ApiGatewayIntegration(
      this,
      "ApiGwProxyIntegration",
      {
        httpMethod: apiGwProxyMethod.httpMethod,
        resourceId: apiGwProxyMethod.resourceId,
        restApiId: this.apiGw.id,
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        uri: bffLambdaFunction.invokeArn,
      }
    );

    const apiGwDeployment = new aws.apigateway.ApiGatewayDeployment(
      this,
      "ApiGwDeployment",
      {
        restApiId: this.apiGw.id,
        dependsOn: [proxyIntegration],
        // TODO: implement
        // https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment#example-usage
        // https://github.com/hashicorp/terraform/issues/6613
        // https://github.com/hashicorp/terraform-provider-aws/issues/162
        //triggers: {
        //  redeployment: ""
        //},
        //
        lifecycle: {
          createBeforeDestroy: true,
        },
      }
    );

    this.apiGwStage = new aws.apigateway.ApiGatewayStage(this, "ApiGwStage", {
      deploymentId: apiGwDeployment.id,
      restApiId: this.apiGw.id,
      stageName: "prod",
    });

    new aws.lambdafunction.LambdaPermission(this, "ApiGwLambda", {
      functionName: bffLambdaFunction.functionName,
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      sourceArn: `${this.apiGw.executionArn}/*/*`,
    });

    new TerraformOutput(this, "BffUrl", {
      value: this.apiGwStage.invokeUrl,
    });
  }
}

class FrontendStack extends TerraformStack {
  constructor(scope: Construct, name: string, config: FrontendStackConfig) {
    super(scope, name);

    const monorepoPath = path.join(__dirname, "..", "..");

    new vercel.VercelProvider(this, "Provider");

    const webProjectDirectory = new vercel.DataVercelProjectDirectory(
      this,
      "webProjectDirectory",
      {
        path: monorepoPath,
      }
    );
    const webProject = new vercel.Project(this, "WebProject", {
      name: "turborepo-cdktf-microservices-app",
      framework: "nextjs",
      rootDirectory: "frontend/web",
      environment: [
        {
          key: "NEXT_PUBLIC_API_URL",
          value: config.apiUrl,
          target: ["production", "development", "preview"],
        },
      ],
      buildCommand: "cd ../.. && pnpm turbo run build --filter=web",
    });

    const webDeployment = new vercel.Deployment(this, "WebDeployment", {
      projectId: webProject.id,
      //@ts-ignore
      files: webProjectDirectory.files,
      pathPrefix: webProjectDirectory.path,
      production: true,
    });

    new TerraformOutput(this, "FrontendWebUrl", {
      value: webDeployment.url,
    });
  }
}

const app = new App();

const backend = new BackendStack(app, "backend", {
  queueName: "csv2pdf",
  bff: {
    function: {
      entry: path.join(
        __dirname,
        "..",
        "..",
        "bff",
        "services",
        "aggregation",
        "dist", // make sure that run build before deploy see #L170
        "lambda.js"
      ),
    },
  },
  python: {
    function: {
      entry: path.join(
        __dirname,
        "..",
        "..",
        "backend",
        "services",
        "csv-to-pdf-microservice"
      ),
      handler: "lambda.lambda_handler", // lambda.py:lambda_handler
    },
  },
});

const frontend = new FrontendStack(app, "frontend", {
  apiUrl: backend.apiGwStage.invokeUrl,
});

frontend.addDependency(backend);
app.synth();
