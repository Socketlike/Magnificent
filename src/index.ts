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
  const imageModule = await webpack.waitForModule<Record<string, ImageComponent>>(
    webpack.filters.bySource('"imageClassName"'),
  );

  const imageComponent = imageModule
    ? webpack.getFunctionBySource<ImageComponent>(imageModule, 'Ref')
    : undefined;

  if (imageComponent && 'prototype' in imageComponent)
    injector.after(imageComponent.prototype, 'render', (_, res: JSX.Element): JSX.Element => {
      // this will only let "popout" images pass, because "popout" images are not clickable
      // hence no [class*=clickable-]
      if (!res?.props?.children?.props?.className?.match?.(/clickable-/)) {
        // this function's typing is ridiculous
        // it's designed *for* JSX.Element trees, yet **doesn't allow** JSX.Element?
        // time for typecast fuckery :husk:
        const image = util.findInReactTree(res as unknown as util.Tree, (_): boolean => {
          const tree = _ as unknown as JSX.Element;
          // only let images without className pass - the "popout" images doesn't have className
          return tree?.type === 'img' && tree.props && !tree.props.className;
        }) as unknown as JSX.Element;

        if (image && typeof image.props?.src === 'string')
          image.props.src = image.props.src
            .replace(/\?width=[0-9]+&height=[0-9]+$/, '')
            .replace('media.discordapp.net', 'cdn.discordapp.com');
      }

      return res;
    });
  else
    logger.error(
      !imageComponent
        ? 'Unable to get image component'
        : 'Expected image component but got something else',
      imageModule,
      imageComponent,
    );
};

export const stop = (): void => injector.uninjectAll();
