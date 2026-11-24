import { hasAttribute } from '../../html/tree.mjs';
import { finding } from '../finding.mjs';

function checkImages({ elements }) {
  const results = [];
  for (const image of elements.filter((element) => element.tagName === 'img')) {
    if (!hasAttribute(image, 'alt')) {
      results.push(finding('img-alt', 'error', 'Image is missing an alt attribute', image));
    }
    if (!hasAttribute(image, 'width') || !hasAttribute(image, 'height')) {
      results.push(finding('img-dimensions', 'warning', 'Image needs width and height to prevent layout shift', image));
    }
  }
  return results;
}

export const mediaRules = [checkImages];
