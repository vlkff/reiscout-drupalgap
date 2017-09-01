/**
 * Implements hook_device_connected().
 */
function reiscout_property_device_connected() {
  if ('undefined' !== typeof drupalgap.menu_links['node/%/edit']) {
    drupalgap.menu_links['node/%/edit'].access_callback = '_reiscout_property_node_edit_access';
  }
}

/**
 * Implements hook_menu().
 */
function reiscout_property_menu() {
  var items = {};

  items['property-listing'] = {
    title: 'Reiscout',
    page_callback: 'reiscout_property_listing_page',
    pageshow: 'reiscout_property_listing_pageshow',
    // See go.inc.js, drupalgap_goto(), line 151
    options: {
      reloadPage: true
    }
  };

  items['my-properties'] = {
    title: 'My Properties',
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
 * Implements hook_form_alter().
 */
function reiscout_property_form_alter(form, form_state, form_id) {
  try {
    if (form_id == 'node_edit' && form.bundle == 'property') {
      // The title field is hidden using CSS. Here we set its value to some text.
      // The field value will be filled with real value on a server side on save.
      form.elements['title'].default_value = 'value placeholder';

      // Prevent user from editing fields
      var fields = [
        // hide product field
        'field_address_access_product',
        // hide owner info fields
        'field_owner_postal_address', 'field_owner_phone',
        // hide property info fields
        'field_assessed_value', 'field_last_sale_price', 'field_last_sale_date', 'field_mortgage_company',
        'field_gross_area', 'field_bedrooms', 'field_full_baths', 'field_half_baths', 'field_year_built',
        'field_effective_year_built', 'field_lot_area_acres', 'field_zoning', 'field_repairs_price',
        'field_arv', 'field_under_contract',
        // hide equity percentage field
        'field_ep_calculated',
        // hide the 'Data Quality Tags' field
        'field_data_quality_tags'
      ];
      for (var i in fields) {
        var fieldname = fields[i];
        if (form.elements[fieldname]) {
          form.elements[fieldname].access = false;
        }
      }

      if ('undefined' !== typeof form.elements['field_data_locked']) {
        if (!drupalgap_user_has_role('administrator')) {
          form.elements['field_data_locked'].access = false;
        }
      }

      // Set the initial value of the 'field_place_on_marketplace' field to its default value
      if (undefined === form.elements['field_place_on_marketplace']['und'][0].value) {
        var default_value = form.elements['field_place_on_marketplace'].field_info_instance.default_value[0].value;
        form.elements['field_place_on_marketplace']['und'][0].value = default_value;
      }

      if (!Drupal.user.content_types_user_permissions.property.delete_own
       && !Drupal.user.content_types_user_permissions.property.delete_any) {
        if ('undefined' !== typeof form.buttons.delete) {
          delete form.buttons.delete;
        }
      }
    }
  }
  catch (error) {
    console.log('reiscout_property_form_alter - ' + error);
  }
}

/**
 * The page callback to display the view.
 */
function reiscout_property_listing_page() {
  try {
    var content = {};

    // A form with filters for filtering of a list of properties
    content['filter_properties_form'] = {
      markup: drupalgap_get_form('reiscout_property_filter_form')
    };

    // A list of properties
    content['property_list'] = {
      markup: '<div id="property-list"></div>'
    };

    return content;
  }
  catch (error) {
    console.log('reiscout_property_listing_page - ' + error);
  }
}

/**
 * A callback that is used during the pageshow event.
 */
function reiscout_property_listing_pageshow() {
  setTimeout(function() {
    // We want to set 'City' as a placeholder for an autocomplete field
    var city_form_element_id = drupalgap_form_get_element_id('city', 'reiscout_property_filter_form');
    var zip_form_element_id = drupalgap_form_get_element_id('zip', 'reiscout_property_filter_form');
    var apply_form_element_id = drupalgap_form_get_element_id('apply', 'reiscout_property_filter_form');
    var autocomplete_form_element_selector = _theme_autocomplete_input_selector[city_form_element_id];
    $(autocomplete_form_element_selector).attr('placeholder', 'City');

    // After 'Clear text' button was clicked we want to clear a hidden text field that holds the value
    $('.ui-input-clear').on('click', function() {
      $('#' + city_form_element_id).val('');
    });

    // Submit a form, when a user has pressed the 'Enter' button
    $('#' + zip_form_element_id).on('keypress', function(e) {
      if (13 === e.which) {
        $('#' + apply_form_element_id).focus().click();
        return false;
      }
    });
  }, 300);

  _reiscout_property_update_list();
}

/**
 * Provides a form with filters for filtering of a list of properties.
 *
 * Provides filters that allows user to filter a list of properties
 * by a city and by a ZIP code.
 */
function reiscout_property_filter_form(form, form_state) {
  try {
    form.prefix = t('Enter a city or a zip code to filter properties by');

    form.elements['city'] = {
      type: 'autocomplete',
      remote: true,
      custom: true,
      handler: 'views',
      path: 'reiscout_property/address_locality/drupalgap',
      value: 'value',
      filter: 'value'
    };

    form.elements['zip'] = {
      type: 'number',
      title: 'ZIP Code',
      title_placeholder: true
    };

    form.elements['apply'] = {
      type: 'submit',
      value: 'Apply',
      attributes: {
        'data-mini': true
      }
    };

    form.buttons['reset'] = {
      title: 'Reset',
      attributes: {
        'data-mini': true,
        onclick: '_reiscout_property_reset_fiters()'
      }
    };

    return form;
  }
  catch (error) {
    console.log('reiscout_property_filter_form - ' + error);
  }
}

/**
 * Form submission handler for reiscout_property_filter_form().
 */
function reiscout_property_filter_form_submit(form, form_state) {
  try {
    _reiscout_property_update_list(form_state.values.city, form_state.values.zip);
  }
  catch (error) {
    console.log('reiscout_property_filter_form_submit - ' + error);
  }
}

/**
 * Resets filters that is used for filtering of a list of properties.
 */
function _reiscout_property_reset_fiters() {
  var city_form_element_id = drupalgap_form_get_element_id('city', 'reiscout_property_filter_form');
  var zip_form_element_id = drupalgap_form_get_element_id('zip', 'reiscout_property_filter_form');
  var autocomplete_form_element_selector = _theme_autocomplete_input_selector[city_form_element_id];

  $('#' + city_form_element_id).val('');
  $('#' + zip_form_element_id).val('');
  $(autocomplete_form_element_selector).val('');

  _reiscout_property_update_list();
}

/**
 * Updates properties list.
 *
 * Makes a request to the server for getting a content of the views,
 * renders the content and injects it in the 'property-list' container.
 */
function _reiscout_property_update_list(city, zip) {
  try {
    var params = '';

    if (city) {
      params += params ? '&' : '?';
      params += 'city=' + city;
    }

    if (zip) {
      params += params ? '&' : '?';
      params += 'zip=' + zip;
    }

    var current_page_id = drupalgap_get_page_id();
    switch (current_page_id) {
      case 'property_listing':
        var view = {
          format: 'unformatted_list',
          path: 'drupalgap/views_datasource/property-listing' + params,
          row_callback: 'reiscout_property_listing_row',
          empty_callback: 'reiscout_property_listing_empty',
          attributes: {
            id: current_page_id + ' #property-list'
          }
        };
        break;
      case 'my_properties':
        var view = {
          format: 'unformatted_list',
          path: 'drupalgap/views_datasource/my-properties/' + Drupal.user.uid + params,
          row_callback: 'reiscout_property_listing_row',
          empty_callback: 'reiscout_property_my_properties_view_empty',
          attributes: {
            id: current_page_id + ' #property-list'
          }
        };
        break;
      case 'purchased_leads':
        var view = {
          format: 'unformatted_list',
          path: 'drupalgap/views_datasource/purchased_address_list/' + Drupal.user.uid + params,
          row_callback: 'reiscout_purchased_addresses_list_row',
          empty_callback: 'reiscout_purchased_addresses_list_empty',
          attributes: {
            id: current_page_id + ' #property-list'
          }
        };
        break;
      default:
        throw t('There is no any view for the current page: ') + current_page_id;
    }

    // We need to set the value of the page_id key, because it will
    // be used by views_embed_view() function.
    view.page_id = drupalgap_get_page_id();

    // Make a request to the server for getting a content of the views,
    // render the content and inject it in the view.attributes.id container.
    _theme_view(view);
  }
  catch (error) {
    console.log('_reiscout_property_update_list - ' + error);
  }
}

/**
 * The row callback to render a single row.
 */
function reiscout_property_listing_row(view, row) {
  try {
    var row_html = '';

    if (row.image.src && typeof row.image.src !== "undefined") {
      var image = theme('image', {
        path: row.image.src,
        alt: row.image.alt
      });
      row_html = '<div class="image">' + image + '</div>';

      if (row.data_quality_tags) {
        row_html += _reiscout_property_build_data_quality_tags_html(row.data_quality_tags);
      }

      if (row.address && row.address.length) {
        row_html += '<div class="address">' + row.address + '</div>';
      }
      else if ('undefined' != typeof row.city && 'undefined' != typeof row.zip) {
        row_html += '<div class="address">' + row.city + ', ' + row.zip + '</div>';
      }

      row_html = '<div class="view-row">' + l(row_html, 'node/' + row.nid, {reloadPage: true}) + '</div>';
    }

    return row_html;
  }
  catch (error) {
    console.log('reiscout_property_listing_row - ' + error);
  }
}

/**
 * Shows empty view content
 */
function reiscout_property_listing_empty(view) {
  try {
    return t('Sorry, no property objects were found.');
  }
  catch (error) {
    console.log('reiscout_property_listing_empty - ' + error);
  }
}

/**
 * Shows empty view content
 */
function reiscout_property_my_properties_view_empty(view) {
  try {
    return t('You have not added any property objects yet.');
  }
  catch (error) {
    console.log('reiscout_property_my_properties_view_empty - ' + error);
  }
}

/**
 * Implements hook_entity_post_render_field().
 * Called after drupalgap_entity_render_field() assembles the field content
 * string. Use this to make modifications to the HTML output of the entity's
 * field before it is displayed. The field content will be inside of
 * reference.content, so to make modifications, change reference.content. For
 * more info: http://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language
 */
function reiscout_property_entity_post_render_field(entity, field_name, field, reference) {
  try {
    if (field.entity_type === 'node' && field.bundle === 'property') {
      if (field_name === 'field_image') {
        // If an image was not uploaded for the 'Photo' field,
        // use the default image if it is specified.
        if (empty(entity.field_image) && 'undefined' !== typeof entity._default_field_image_uri) {
          var image = theme('image', {
            path: drupalgap_image_path(entity._default_field_image_uri)
          });

          reference.content = '<div class="field_image">' + image + '</div>';
        }

        if (Drupal.user.uid != 0 && typeof entity._purchased_counter !== 'undefined') {
          reference.content += 'This lead has been purchased: ' + (entity._purchased_counter == 1 ? '1 time' : entity._purchased_counter + ' times');
        }
      }
      else if (field_name == 'field_address') {
        if (!_reiscout_property_user_can_view_property_address(entity, Drupal.user.uid)) {
          if ('undefined' !== typeof entity._address) {
            reference.content = '<div class="field_address">'
              + '<h3>Address</h3>'
              + entity._address
              + '</div>';
          }
          else {
            reference.content = '';
          }
        }
      }
      else if (field_name === 'field_owner_postal_address') {
        if (!_reiscout_property_user_can_view_property_owner_info(entity, Drupal.user.uid)) {
          reference.content = '';
        }
        else if ('undefined' !== typeof entity.field_owner_postal_address['und']
              && entity.field_owner_postal_address['und'][0].thoroughfare) {
          reference.content += drupalgap_get_form('reiscout_mail_send_postcard_form', entity.nid);
          reference.content += drupalgap_get_form('reiscout_mail_buy_sending_points_form');

          // Forms that we added above are not visible by default, so we need
          // to display one of them. But we can do it only after all the node
          // content will be rendered and injected in the node container.
          $('#node_' + entity.nid + '_view_container').one('create', function() {
            _reiscout_mail_display_available_form(entity.nid);
          });
        }
      }
      else if (field_name === 'field_owner_phone') {
        if (!_reiscout_property_user_can_view_property_owner_info(entity, Drupal.user.uid)) {
          reference.content = '';
        }
      }
      else if (field_name === 'field_data_quality_tags') {
        // If the 'Data Quality Tags' field of the node is not empty
        if ('undefined' !== typeof entity.field_data_quality_tags['und']) {
          reference.content = '<div class="field_data_quality_tags">';
          reference.content += '<div class="data-quality-tags">';

          $.each(entity.field_data_quality_tags['und'], function(key, tag) {
            var tag_class = tag.name.replace(' ', '-').toLowerCase();
            reference.content += '<div class="' + tag_class + ' data-quality-tag">';
            reference.content += '<span class="text">' + tag.name + '</span>';
            reference.content += '</div>';
          });

          reference.content += '</div>';
          reference.content += '</div>';
        }
        else {
          reference.content = '';
        }
      }
      else if (field_name === 'field_full_baths') {
        if ('undefined' !== typeof entity.field_full_baths.und && 'undefined' !== typeof entity.field_half_baths.und) {
          reference.content = '<div class="field_baths">';
          reference.content += '<h3>Baths (Full / Half)</h3>'
                             + entity.field_full_baths.und[0].value
                             + ' / '
                             + entity.field_half_baths.und[0].value;
          reference.content += '</div>';
        }
        else if ('undefined' !== typeof entity.field_full_baths.und) {
          reference.content = '<div class="field_full_baths">';
          reference.content += '<h3>Full Baths</h3>'
                             + entity.field_full_baths.und[0].value
          reference.content += '</div>';
        }
        else if ('undefined' !== typeof entity.field_half_baths.und) {
          reference.content = '<div class="field_half_baths">';
          reference.content += '<h3>Half Baths</h3>'
                             + entity.field_half_baths.und[0].value
          reference.content += '</div>';
        }
        else {
          reference.content = '';
        }
      }
      else if (field_name === 'field_half_baths') {
        reference.content = '';
      }
      else if (field_name === 'field_year_built') {
        if ('undefined' !== typeof entity.field_year_built.und && 'undefined' !== typeof entity.field_effective_year_built.und) {
          reference.content = '<div class="field_year_built">';
          reference.content += '<h3>Year Built / Eff</h3>'
            + entity.field_year_built.und[0].value
            + ' / '
            + entity.field_effective_year_built.und[0].value;
          reference.content += '</div>';
        }
        else if ('undefined' !== typeof entity.field_year_built.und) {
          reference.content = '<div class="field_year_built">';
          reference.content += '<h3>Year Built</h3>'
            + entity.field_year_built.und[0].value
          reference.content += '</div>';
        }
        else if ('undefined' !== typeof entity.field_effective_year_built.und) {
          reference.content = '<div class="field_effective_year_built">';
          reference.content += '<h3>Effective Year Built</h3>'
            + entity.field_effective_year_built.und[0].value
          reference.content += '</div>';
        }
        else {
          reference.content = '';
        }
      }
      else if (field_name === 'field_effective_year_built') {
        reference.content = '';
      }
    }
  }
  catch (error) {
    console.log('reiscout_property_entity_post_render_field - ' + error);
  }
}

/**
 * Defines if a user has an access to view a property's address.
 *
 * User may see a property's address if:
 * - he is a property's author OR
 * - he has bought a property's address.
 *
 * @param {object} entity
 * @param {int} uid
 * @returns {boolean}
 */
function _reiscout_property_user_can_view_property_address(entity, uid) {
  // If user is an administrator.
  if (drupalgap_user_has_role('administrator')) {
    return true;
  }

  // If user is a property's author.
  if (entity.uid == uid) {
    return true;
  }

  // If user has bought a property's address.
  if (typeof entity._user_bought_address_access_product !== 'undefined'
    && entity._user_bought_address_access_product === true) {
    return true;
  }

  return false;
}

/**
 * Defines if user has an access to view a property's owner info.
 *
 * User may see info about property's owner if:
 * - he is a property's author OR
 * - he has bought a property's address.
 *
 * @param {object} entity
 * @param {int} uid
 * @returns {boolean}
 */
function _reiscout_property_user_can_view_property_owner_info(entity, uid) {
  // If user is an administrator.
  if (drupalgap_user_has_role('administrator')) {
    return true;
  }

  // If user is a property's author.
  if (entity.uid == uid) {
    return true;
  }

  // If user has bought a property's address.
  if (typeof entity._user_bought_address_access_product !== 'undefined'
    && entity._user_bought_address_access_product === true) {
    return true;
  }

  return false;
}

/**
 * Determines if the current user has an access to edit the node given.
 * @param {Object} node
 * @return {Boolean}
 */
function _reiscout_property_node_edit_access(node) {
  try {
    // If the 'Lock data' field of the node is set to true
    if ('undefined' !== typeof node.field_data_locked['und']
     && 1 == node.field_data_locked['und'][0].value) {
      return false;
    }

    if ((node.uid == Drupal.user.uid && user_access('edit own ' + node.type + ' content'))
     || user_access('edit any ' + node.type + ' content')) {
      return true;
    }
    else {
      return false;
    }
  }
  catch (error) {
    console.log('_reiscout_property_node_edit_access - ' + error);
  }
}

/**
 * Builds HTML content to display data quality tags.
 */
function _reiscout_property_build_data_quality_tags_html(tags) {
  var html = '<div class="data-quality-tags">';

  tags = tags.split(',');
  jQuery.each(tags, function(key, tag) {
    var tag_class = tag.replace(' ', '-').toLowerCase();
    html += '<div class="' + tag_class + ' data-quality-tag">';
    html += '<span class="text">' + tag + '</span>';
    html += '</div>';
  });

  html += '</div>';

  return html;
}
