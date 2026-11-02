import { Injectable } from '@angular/core';
import { Camera, CameraDirection } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class ProfilePhotoService {
  async takeProfilePhoto(): Promise<string> {
    const result = await Camera.takePhoto({
      quality: 82,
      cameraDirection: CameraDirection.Front,
      targetWidth: 900,
      targetHeight: 900,
    });

    if (result.webPath) {
      return result.webPath;
    }
    if (result.thumbnail) {
      const format = result.metadata?.format === 'png' ? 'png' : 'jpeg';
      return `data:image/${format};base64,${result.thumbnail}`;
    }
    throw new Error('The camera did not return a photo.');
  }
}
