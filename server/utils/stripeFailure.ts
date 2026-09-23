// Log only structured diagnostics, never raw fetch errors (which may contain API keys).
export function stripeFailure(error: unknown) {
  const source = error as { status?: number; statusCode?: number; response?: { status?: number; headers?: { get?: (name: string) => string | null } }; data?: { error?: { type?: string; code?: string } }; cause?: { code?: string }; name?: string } | null
  const status = source?.response?.status ?? source?.statusCode ?? source?.status
  const request = source?.response?.headers?.get?.('request-id')
  const type = source?.data?.error?.type
  const code = source?.data?.error?.code
  const category = status === 401 ? 'authentication' : status === 403 ? 'permissions' : status === 429 ? 'rate_limit' : status && status >= 500 ? 'stripe_unavailable' : status && status >= 400 ? 'request_rejected' : source?.name === 'TimeoutError' || source?.cause?.code === 'ETIMEDOUT' ? 'timeout' : 'connection_or_response'
  return {
    category,
    status: typeof status === 'number' ? status : undefined,
    requestId: typeof request === 'string' && /^req_[a-zA-Z0-9]{1,80}$/.test(request) ? request : undefined,
    type: ['api_error', 'invalid_request_error', 'authentication_error', 'card_error', 'rate_limit_error'].includes(type || '') ? type : undefined,
    code: ['api_key_expired', 'account_invalid', 'capability_not_active', 'parameter_invalid_empty', 'parameter_missing', 'parameter_unknown', 'url_invalid', 'resource_missing', 'amount_too_small'].includes(code || '') ? code : undefined,
  }
}
