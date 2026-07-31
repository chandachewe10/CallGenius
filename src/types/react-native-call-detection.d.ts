declare module 'react-native-call-detection' {
  export const permissionDenied: string;

  export default class CallDetectorManager {
    constructor(
      callback: (event: string, phoneNumber?: string) => void,
      readPhoneNumberAndroid?: boolean,
      permissionDeniedCallback?: () => void,
      permissionMessage?: { title: string; message: string },
    );

    dispose(): void;
  }
}
