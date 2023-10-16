import { Injector, Logger, util, webpack } from 'replugged';

const injector = new Injector();
const logger = Logger.plugin('Magnificent');

// we don't need to go in depth into typing the constructor; it's not needed
interface ImageComponent {
  (): void;
  prototype: {
    render: () => JSX.Element;
  };
}

export const start = async (): Promise<void> => {
  const imageComponent = await webpack.waitForModule<ImageComponent>(
    webpack.filters.bySource('"imageClassName"'),
  );

  if (imageComponent?.prototype)
    injector.after(imageComponent.prototype, 'render', (_, res: JSX.Element): JSX.Element => {
      // fail fast if image component is rendered as an embed
      let isEmbed = false;

      // please fix the typings of this method it's truly ridiculous
      const image = util.findInReactTree(res as unknown as util.Tree, (_): boolean => {
        const element = _ as unknown as JSX.Element;

        if (element?.props?.className?.match?.(/clickable-/)) isEmbed = true;

        return (
          (element?.type === 'img' &&
            typeof element?.props?.src === 'string' &&
            !element?.props?.className) ||
          isEmbed
        );
      }) as unknown as JSX.Element;

      if (image && !isEmbed)
        image.props.src = image.props.src
          .replace(/\?width=[0-9]+&height=[0-9]+$/, '')
          .replace('media.discordapp.net', 'cdn.discordapp.com');

      return res;
    });
  else
    logger.error(
      !imageComponent
        ? 'Unable to get image component'
        : 'Expected image component but got something else',
      imageComponent,
    );
};

export const stop = (): void => injector.uninjectAll();
