/**
 * Implements hook_menu().
 * @return {Object}
 */
function reiscout_purchased_addresses_menu() {
  var items = {};

  items['purchased-addresses'] = {
    title: 'Purchased Addresses',
    page_callback: 'reiscout_property_listing_page',
    pageshow: 'reiscout_property_listing_pageshow',
    // See go.inc.js, drupalgap_goto(), line 151
    options: {
      reloadPage: true
    }
  };

  return items;
}

/**
 * The row callback to render a single row.
 */
function reiscout_purchased_addresses_list_row(view, row) {
  try {
    var image = theme('image', {
      path: row.image.src,
      alt: row.image.alt
    });

    var html = '<div class="image">' + image + '</div>';

    if ('undefined' != typeof row.data_verified && 1 == row.data_verified) {
      html += '<div class="data-verified-container">';
      html += '<i class="icon"></i><div class="text">Reiscout data</div>';
      html += '</div>';
    }

    html += '<div class="address">' + row.address + '</div>';

    return '<div class="view-row">' + l(html, 'node/' + row.nid, {reloadPage: true}) + '</div>';
  }
  catch (error) {
    console.log('reiscout_purchased_addresses_list_row - ' + error);
  }
}

/**
 * The callback to display info if there are no items to display.
 */
function reiscout_purchased_addresses_list_empty(view) {
  return t('You have not purchased address access to any property yet.');
}