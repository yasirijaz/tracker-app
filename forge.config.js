const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config:(arch)=> ({
        remoteReleases: `https://wsh-pub-upload.s3.us-west-2.amazonaws.com/tracker-app/win32/${arch}`
      })
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config:(arch) => ({
            macUpdateManifestBaseUrl: `https://wsh-pub-upload.s3.us-west-2.amazonaws.com/tracker-app/darwin/${arch}`
      })
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ]
  // publishers: [
  //   {
  //     name: '@electron-forge/publisher-s3',
  //     config: {
  //       bucket: 'wsh-pub-upload',
  //       region: 'us-west-2',
  //       public: true,
  //       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  //     }
  //   }
  // ]
};
