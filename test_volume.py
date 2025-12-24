from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

device = AudioUtilities.GetSpeakers()
volume = device.EndpointVolume  # no Activate call

print("Current scalar:", volume.GetMasterVolumeLevelScalar())
volume.SetMasterVolumeLevelScalar(0.32, None)   # 30%
print("New scalar:", volume.GetMasterVolumeLevelScalar())
