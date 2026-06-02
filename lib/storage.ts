import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getClient(): S3Client {
  const region = process.env.AWS_REGION ?? "ap-northeast-1";
  const endpoint = process.env.AWS_ENDPOINT;
  return new S3Client({
    region,
    // LocalStack など独自エンドポイントがある場合は forcePathStyle が必要
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });
}

function getBucket(): string | null {
  return process.env.S3_BUCKET ?? null;
}

/**
 * S3 にファイルをアップロードする。
 * S3_BUCKET が未設定の場合はスキップする（ローカル開発・テキスト抽出のみで動作）。
 */
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const bucket = getBucket();
  if (!bucket) return;
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

/**
 * S3 からファイルを削除する。
 * S3_BUCKET が未設定の場合はスキップする。
 * 論理削除されたドキュメントのバイナリ削除に使う。
 */
export async function deleteFromS3(key: string): Promise<void> {
  const bucket = getBucket();
  if (!bucket) return;
  // gdrive: / box: プレフィックスは S3 キーではないためスキップ
  if (key.startsWith("gdrive:") || key.startsWith("box:")) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
