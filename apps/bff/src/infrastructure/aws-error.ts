import {
  ApplicationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../application/errors.js';

interface AwsLikeError extends Error {
  name: string;
}

export function mapAwsError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (!(error instanceof Error)) {
    return new ApplicationError('AWS_ERROR', 'AWSサービスの呼び出しに失敗しました', 502);
  }

  const awsError = error as AwsLikeError;
  switch (awsError.name) {
    case 'ResourceNotFoundException':
      return new ResourceNotFoundError('指定したAWSリソースが見つかりません', { cause: error });
    case 'ResourceAlreadyExistsException':
    case 'ConflictException':
      return new ResourceConflictError('同じIDのAWSリソースがすでに存在します', { cause: error });
    case 'AccessDeniedException':
      return new ApplicationError('AWS_ACCESS_DENIED', 'AWSへのアクセス権限がありません', 502, {
        cause: error,
      });
    case 'ThrottlingException':
    case 'ProvisionedThroughputExceededException':
      return new ApplicationError(
        'AWS_THROTTLED',
        'AWSへのリクエストが集中しています。しばらく待って再試行してください',
        503,
        { cause: error },
      );
    case 'InvalidImageFormatException':
    case 'ImageTooLargeException':
    case 'InvalidParameterException':
      return new ApplicationError('AWS_INVALID_INPUT', 'AWSが入力内容を受け付けませんでした', 400, {
        cause: error,
      });
    default:
      return new ApplicationError('AWS_ERROR', 'AWSサービスの呼び出しに失敗しました', 502, {
        cause: error,
      });
  }
}
