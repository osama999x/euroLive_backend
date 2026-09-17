export class ApiResponseDto<T> {
  constructor(
    public readonly data: T,
    public readonly message = 'Success',
  ) {}

  static ok<T>(data: T, message = 'Success'): ApiResponseDto<T> {
    return new ApiResponseDto(data, message);
  }

  static created<T>(data: T, message = 'Created'): ApiResponseDto<T> {
    return new ApiResponseDto(data, message);
  }

  static empty(message = 'Success'): ApiResponseDto<null> {
    return new ApiResponseDto(null, message);
  }
}
