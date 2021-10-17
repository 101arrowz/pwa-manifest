import PWAManifestGenerator, { Manifest, HTMLInsert } from '../index';
import testConfigs, { Config, ResultConfig, ErrorConfig } from './testConfigs';
jest.setTimeout(30000);
const testConfig = ({ config, msg, ...props }: Config): void =>
  test(msg || 'icons are correctly generated', async () => {
    let generator: PWAManifestGenerator;
    let generatedHTML: HTMLInsert[];
    let generatedFiles: string[];
    let generatedBrowserConfig: string;
    let generatedManifest: Manifest;
    try {
      generator = new PWAManifestGenerator(
        config,
        {
          baseURL: './',
          resolveDir: __dirname
        },
        {
          name: 'tester',
          desc: 'test'
        }
      );
      generator.hashMethod = 'content';
      const result = await generator.generate();
      generatedHTML = result.html;
      generatedFiles = Object.keys(result.generatedFiles);
      generatedBrowserConfig = result.browserConfig;
      generatedManifest = result.manifest;
    } catch (e) {
      const throws = (props as ErrorConfig).throws;
      if (throws && new RegExp(throws).test(e as string)) return;
      throw new Error(e);
    }
    const { logOutput, throws } = props as ResultConfig & ErrorConfig;
    if (throws) throw new Error('Did not throw for error config.');
    if (logOutput)
      console.log(
        msg +
          '\nFiles: [' +
          generatedFiles
            .map(str => "'" + str.replace(/'/, "\\'") + "'")
            .join(', ') +
          ']'
      );
    expect(generatedFiles).toMatchSnapshot();
    expect(generatedManifest).toMatchSnapshot();
    expect(generatedBrowserConfig).toMatchSnapshot();
    expect(generatedHTML).toMatchSnapshot();
  });
for (const conf of testConfigs) {
  testConfig(conf);
}
