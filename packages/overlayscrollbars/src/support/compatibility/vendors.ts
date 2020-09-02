import { each, hasOwnProperty } from 'support/utils';
import { createDiv } from 'support/dom';

const firstLetterToUpper = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
const getDummyStyle = (): CSSStyleDeclaration => createDiv().style;

// https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix

export const cssPrefixes: ReadonlyArray<string> = ['-webkit-', '-moz-', '-o-', '-ms-'];
export const jsPrefixes: ReadonlyArray<string> = ['WebKit', 'Moz', 'O', 'MS', 'webkit', 'moz', 'o', 'ms'];

export const jsCache: { [key: string]: any } = {};
export const cssCache: { [key: string]: string } = {};

/**
 * Gets the name of the given CSS property with vendor prefix if it isn't supported without, or undefined if unsupported.
 * @param name The name of the CSS property which shall be get.
 */
export const cssProperty = (name: string): string | undefined => {
  let result: string | undefined = cssCache[name];

  if (hasOwnProperty(cssCache, name)) {
    return result;
  }

  const uppercasedName: string = firstLetterToUpper(name);
  const elmStyle: CSSStyleDeclaration = getDummyStyle();

  each(cssPrefixes, (prefix: string) => {
    const prefixWithoutDashes: string = prefix.replace(/-/g, '');
    const resultPossibilities: Array<string> = [
      name, // transition
      prefix + name, // -webkit-transition
      prefixWithoutDashes + uppercasedName, // webkitTransition
      firstLetterToUpper(prefixWithoutDashes) + uppercasedName, // WebkitTransition
    ];
    result = resultPossibilities.find((resultPossibility: string) => elmStyle[resultPossibility] !== undefined);
    return !result;
  });

  cssCache[name] = result;
  return result;
};

/**
 * Get the name of the given CSS property value(s), with vendor prefix if it isn't supported wuthout, or undefined if no value is supported.
 * @param property The CSS property to which the CSS property value(s) belong.
 * @param values The value(s) separated by spaces which shall be get.
 * @param suffix A suffix which is added to each value in case the value is a function or something else more advanced.
 */
export const cssPropertyValue = (property: string, values: string, suffix?: string): string | undefined => {
  const name = `${property} ${values}`;
  let result: string | undefined = cssCache[name];

  if (hasOwnProperty(cssCache, name)) {
    return result;
  }

  const dummyStyle: CSSStyleDeclaration = getDummyStyle();
  const possbleValues: Array<string> = values.split(' ');
  const preparedSuffix: string = suffix || '';
  const cssPrefixesWithFirstEmpty = [''].concat(cssPrefixes);

  each(possbleValues, (possibleValue: string) => {
    each(cssPrefixesWithFirstEmpty, (prefix: string) => {
      const prop = prefix + possibleValue;
      dummyStyle.cssText = `${property}:${prop}${preparedSuffix}`;
      if (dummyStyle.length) {
        result = prop;
        return false;
      }
    });
    return !result;
  });

  cssCache[name] = result;
  return result;
};

/**
 * Get the requested JS function, object or constructor with vendor prefix if it isn't supported without or undefined if unsupported.
 * @param name The name of the JS function, object or constructor.
 */
export const jsAPI = <T = any>(name: string): T | undefined => {
  let result: any = jsCache[name] || window[name];

  if (hasOwnProperty(jsCache, name)) {
    return result;
  }

  each(jsPrefixes, (prefix: string) => {
    result = result || window[prefix + firstLetterToUpper(name)];
    return !result;
  });

  jsCache[name] = result;
  return result;
};
