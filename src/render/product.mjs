import { escapeHtml as e } from '../html/escape.mjs';

export function renderProduct(product, position) {
  const loading = position === 0 ? 'eager' : 'lazy';
  return `        <article class="product" id="${e(product.id)}" itemprop="itemListElement" itemscope itemtype="https://schema.org/Product">
          <meta itemprop="productID" content="${e(product.id)}">
          <img class="product__image" itemprop="image" src="${e(product.image)}" alt="${e(product.imageAlt)}" width="${e(product.imageWidth)}" height="${e(product.imageHeight)}" loading="${loading}" decoding="async">
          <div class="product__body">
            <h3 class="product__name" itemprop="name">${e(product.name)}</h3>
            <p itemprop="description">${e(product.description)}</p>
            <dl class="product__facts">
              <div>
                <dt>Brand</dt>
                <dd itemprop="brand" itemscope itemtype="https://schema.org/Brand"><span itemprop="name">${e(product.brand)}</span></dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd itemprop="category">${e(product.category)}</dd>
              </div>
            </dl>
          </div>
        </article>`;
}
