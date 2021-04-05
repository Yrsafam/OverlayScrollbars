import { Environment } from 'environment';
import { OSTarget, OSTargetObject } from 'typings';
import { createStructureSetup, StructureSetup } from 'setups/structureSetup';
import { isHTMLElement } from 'support';

const mockGetEnvironment = jest.fn();
jest.mock('environment', () => {
  return {
    getEnvironment: jest.fn().mockImplementation(() => mockGetEnvironment()),
  };
});

interface StructureSetupProxy {
  input: OSTarget | OSTargetObject;
  setup: StructureSetup;
}

const textareaId = 'textarea';
const textareaHostId = 'host';
const elementId = 'target';
const dynamicContent = 'text<p>paragraph</p>';
const textareaContent = `<textarea id="${textareaId}">text</textarea>`;
const getSnapshot = () => document.body.innerHTML;
const getTarget = (textarea?: boolean) => document.getElementById(textarea ? textareaId : elementId)!;
const fillBody = (textarea?: boolean, customDOM?: (content: string, hostId: string) => string) => {
  document.body.innerHTML = `
    <nav></nav>
    ${
      customDOM
        ? customDOM(textarea ? textareaContent : dynamicContent, textarea ? textareaHostId : elementId)
        : textarea
        ? textareaContent
        : `<div id="${elementId}">${dynamicContent}</div>`
    }
    <footer></footer>
  `;
  return getSnapshot();
};
const clearBody = () => {
  document.body.innerHTML = '';
};

const getElements = (textarea?: boolean) => {
  const target = getTarget(textarea);
  const host = document.querySelector('.os-host')!;
  const padding = document.querySelector('.os-padding')!;
  const viewport = document.querySelector('.os-viewport')!;
  const content = document.querySelector('.os-content')!;

  return {
    target,
    host,
    padding,
    viewport,
    content,
  };
};

const assertCorrectDOMStructure = (textarea?: boolean) => {
  const { target, host, padding, viewport, content } = getElements(textarea);

  expect(host).toBeTruthy();
  expect(viewport).toBeTruthy();
  expect(viewport.parentElement).toBe(padding || host);

  if (content) {
    expect(content.parentElement).toBe(viewport);
  }
  if (padding) {
    expect(padding.parentElement).toBe(host);
  }

  expect(host.parentElement).toBe(document.body);
  expect(host.previousElementSibling).toBe(document.querySelector('nav'));
  expect(host.nextElementSibling).toBe(document.querySelector('footer'));

  const contentElm = content || viewport;
  if (textarea) {
    expect(target.parentElement).toBe(contentElm);
    expect(contentElm.innerHTML).toBe(textareaContent);
  } else {
    expect(target).toBe(host);
    expect(contentElm.innerHTML).toBe(dynamicContent);
  }
};

const createStructureSetupProxy = (target: OSTarget | OSTargetObject): StructureSetupProxy => ({
  input: target,
  setup: createStructureSetup(target),
});

const assertCorrectSetup = (textarea: boolean, setupProxy: StructureSetupProxy, environment: Environment): StructureSetup => {
  const { input, setup } = setupProxy;
  const { _targetObj, _targetCtx, _destroy } = setup;
  const { _target, _host, _padding, _viewport, _content } = _targetObj;
  const { target, host, padding, viewport, content } = getElements(textarea);
  const isTextarea = target.matches('textarea');
  const isBody = target.matches('body');

  expect(textarea).toBe(isTextarea);

  expect(_target).toBe(target);
  expect(_host).toBe(host);

  if (padding || _padding) {
    expect(_padding).toBe(padding);
  } else {
    expect(padding).toBeFalsy();
    expect(_padding).toBeFalsy();
  }

  if (viewport || _viewport) {
    expect(_viewport).toBe(viewport);
  } else {
    expect(viewport).toBeFalsy();
    expect(_viewport).toBeFalsy();
  }

  if (content || _content) {
    expect(_content).toBe(content);
  } else {
    expect(content).toBeFalsy();
    expect(_content).toBeFalsy();
  }

  const { _isTextarea, _isBody, _bodyElm, _htmlElm, _documentElm, _windowElm } = _targetCtx;

  expect(_isTextarea).toBe(isTextarea);
  expect(_isBody).toBe(isBody);
  expect(_windowElm).toBe(document.defaultView);
  expect(_documentElm).toBe(document);
  expect(_htmlElm).toBe(document.body.parentElement);
  expect(_bodyElm).toBe(document.body);

  expect(typeof _destroy).toBe('function');

  const { _nativeScrollbarStyling, _cssCustomProperties, _getInitializationStrategy } = environment;
  const { _padding: paddingNeeded, _content: contentNeeded } = _getInitializationStrategy();
  const inputIsElement = isHTMLElement(input);
  const inputAsObj = input as OSTargetObject;
  const styleElm = document.querySelector('style');
  const checkStrategyDependendElements = (elm: Element | null, input: HTMLElement | boolean | undefined, strategy: boolean) => {
    if (input) {
      expect(elm).toBeTruthy();
    } else {
      if (input === false) {
        expect(elm).toBeFalsy();
      }
      if (input === undefined) {
        if (strategy) {
          expect(elm).toBeTruthy();
        } else {
          expect(elm).toBeFalsy();
        }
      }
    }
  };

  if (_nativeScrollbarStyling || _cssCustomProperties) {
    expect(styleElm).toBeFalsy();
  } else {
    expect(styleElm).toBeTruthy();
  }

  if (inputIsElement) {
    checkStrategyDependendElements(padding, undefined, paddingNeeded);
    checkStrategyDependendElements(content, undefined, contentNeeded);
  } else {
    const { padding: inputPadding, content: inputContent } = inputAsObj;
    checkStrategyDependendElements(padding, inputPadding, paddingNeeded);
    checkStrategyDependendElements(content, inputContent, contentNeeded);
  }

  return setup;
};

const assertCorrectDestroy = (snapshot: string, setup: StructureSetup) => {
  const { _destroy } = setup;

  _destroy();

  // remove empty class attr
  const elms = document.querySelectorAll('*');
  Array.from(elms).forEach((elm) => {
    const classAttr = elm.getAttribute('class');
    if (classAttr === '') {
      elm.removeAttribute('class');
    }
  });

  expect(snapshot).toBe(getSnapshot());
};

const env: Environment = jest.requireActual('environment').getEnvironment();
const envDefault = {
  name: 'default',
  env: env,
};
const envNativeScrollbarStyling = {
  name: 'native scrollbar styling',
  env: {
    ...env,
    _nativeScrollbarStyling: true,
  },
};
const envCssCustomProperties = {
  name: 'custom css properties',
  env: {
    ...env,
    _cssCustomProperties: true,
  },
};
const envInitStrategyMin = {
  name: 'initialization strategy min',
  env: {
    ...env,
    _getInitializationStrategy: () => ({
      _content: false,
      _padding: false,
    }),
  },
};
const envInitStrategyMax = {
  name: 'initialization strategy max',
  env: {
    ...env,
    _getInitializationStrategy: () => ({
      _content: true,
      _padding: true,
    }),
  },
};

describe('structureSetup', () => {
  afterEach(() => clearBody());

  [envDefault, envNativeScrollbarStyling, envCssCustomProperties, envInitStrategyMin, envInitStrategyMax].forEach((envWithName) => {
    const { env: currEnv, name } = envWithName;
    describe(`Environment: ${name}`, () => {
      beforeAll(() => {
        mockGetEnvironment.mockImplementation(() => currEnv);
      });

      [false, true].forEach((isTextarea) => {
        describe(isTextarea ? 'textarea' : 'element', () => {
          describe('basic', () => {
            test('Element', () => {
              const snapshot = fillBody(isTextarea);
              const setup = assertCorrectSetup(isTextarea, createStructureSetupProxy(getTarget(isTextarea)), currEnv);
              assertCorrectDOMStructure(isTextarea);
              assertCorrectDestroy(snapshot, setup);
            });

            test('Object', () => {
              const snapshot = fillBody(isTextarea);
              const setup = assertCorrectSetup(isTextarea, createStructureSetupProxy({ target: getTarget(isTextarea) }), currEnv);
              assertCorrectDOMStructure(isTextarea);
              assertCorrectDestroy(snapshot, setup);
            });
          });

          describe('complex', () => {
            describe('single assigned', () => {
              test('padding', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="content">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('multiple assigned', () => {
              test('padding viewport content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding"><div id="viewport"><div id="content">${content}</div></div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('padding viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding"><div id="viewport">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('padding content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding"><div id="content">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('viewport content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport"><div id="content">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('single false', () => {
              test('padding', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    padding: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('content', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('single true', () => {
              test('padding', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    padding: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('content', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('multiple false', () => {
              test('padding & content', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    padding: false,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('multiple true', () => {
              test('padding & content', () => {
                const snapshot = fillBody(isTextarea);
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    target: getTarget(isTextarea),
                    padding: true,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });

            describe('mixed', () => {
              test('false: padding & content | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: false,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: padding & content | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: true,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: content | false: padding | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: false,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: padding | false: content | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: true,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: padding | assigned: content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="content">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: false,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: padding | assigned: content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="content">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: true,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: padding | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: false,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: padding | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: true,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: padding | assigned: viewport & content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport"><div id="content">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    padding: false,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: padding | assigned: viewport & content', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport"><div id="content">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    padding: true,
                    content: document.querySelector<HTMLElement>('#content')!,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: content | assigned: padding', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: content | assigned: padding', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: content | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: content | assigned: viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="viewport">${content}</div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('false: content | assigned: padding & viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding"><div id="viewport">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: false,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });

              test('true: content | assigned: padding & viewport', () => {
                const snapshot = fillBody(isTextarea, (content, hostId) => {
                  return `<div id="${hostId}"><div id="padding"><div id="viewport">${content}</div></div></div>`;
                });
                const setup = assertCorrectSetup(
                  isTextarea,
                  createStructureSetupProxy({
                    host: document.querySelector<HTMLElement>('#host')!,
                    target: getTarget(isTextarea),
                    padding: document.querySelector<HTMLElement>('#padding')!,
                    viewport: document.querySelector<HTMLElement>('#viewport')!,
                    content: true,
                  }),
                  currEnv
                );
                assertCorrectDOMStructure(isTextarea);
                assertCorrectDestroy(snapshot, setup);
              });
            });
          });
        });
      });
    });
  });
});
