from discounts.engine import DiscountEngine

from products.models import Product, ProductPricingTab, MaterialPrice, Size


class OrderSession:
    def __init__(self, request):
        self.request = request
        self.session = request.session
        cart = self.session.get("cart")
        if not cart:
            cart = {}
            self.session["cart"] = cart
        self.cart = cart

    def __iter__(self):
        cart = self.cart.copy()
        for key, item in cart.items():
            try:
                product_id = item.get('product_id')
                pricing_tab_id = item.get('pricing_tab_id')
                material = item.get('material')

                if not all([product_id, pricing_tab_id, material]):
                    del self.cart[key]
                    self.session.modified = True
                    continue

                product = Product.objects.get(id=product_id)
                pricing_tab = ProductPricingTab.objects.get(id=pricing_tab_id)

                size = None
                size_display = item.get('size_display', "بدون سایز")
                raw_size = item.get('size')

                if raw_size and raw_size != "none" and raw_size != "null":
                    try:
                        size_id = int(raw_size)
                        size = Size.objects.get(id=size_id)
                    except (ValueError, TypeError, Size.DoesNotExist):
                        size = None
                        size_display = "سایز نامعتبر"

                try:
                    material_price = MaterialPrice.objects.get(
                        pricing_tab=pricing_tab,
                        material=material
                    )
                    engine = DiscountEngine(user=self.request.user)

                    discount = engine.calculate_item_price(
                        base_price=material_price.price,
                        product=product,
                        material=material_price,
                        pricing_tab=pricing_tab
                    )

                    current_price = int(discount.final_price)
                    original_price = int(getattr(discount, 'base_price', material_price.price))

                except MaterialPrice.DoesNotExist:
                    current_price = int(item.get('price', 0))
                    original_price = current_price

                quantity = item.get('quantity', 1)

                yield {
                    'id_unique': key,
                    'product_id': product_id,
                    'product_name': item.get('product_name', product.title),
                    'quantity': quantity,
                    'size': size.id if size else None,
                    'size_display': size_display,
                    'material': material,
                    'service': item.get('pricing_tab_service', pricing_tab.tab_name),
                    'unit_price': current_price,
                    'original_price': original_price,
                    'total_price': current_price * quantity,
                    'original_total': original_price * quantity,
                    'price': current_price,
                }

            except (Product.DoesNotExist, ProductPricingTab.DoesNotExist):
                del self.cart[key]
                self.session.modified = True
                continue
            except Exception as e:
                print(f"Error processing cart item {key}: {e}")
                del self.cart[key]
                self.session.modified = True
                continue

    def unique_code(self, product_id, pricing_tab_id, size_id, material):
        size_part = size_id if size_id else "null"
        return f"{product_id}-{pricing_tab_id}-{size_part}--{material}"

    def add(self, product, size, material, service, quantity):
        from products.models import ProductPricingTab

        try:
            pricing_tab = ProductPricingTab.objects.get(
                tab_name=service,
                product=product
            )
        except ProductPricingTab.DoesNotExist:
            raise ValueError(f"سرویس '{service}' برای این محصول وجود ندارد.")

        product_id = product.id
        pricing_tab_id = pricing_tab.id
        size_id = size.id if size else None

        self.add_cart(
            product_id=product_id,
            pricing_tab_id=pricing_tab_id,
            size_id=size_id,
            material=material,
            quantity=quantity
        )

    def add_cart(self, product_id, pricing_tab_id, size_id, material, quantity):
        try:
            product = Product.objects.get(id=product_id)
            pricing_tab = ProductPricingTab.objects.get(id=pricing_tab_id, product=product)
        except (Product.DoesNotExist, ProductPricingTab.DoesNotExist):
            raise ValueError("محصول یا سرویس نامعتبر است.")

        try:
            material_price = MaterialPrice.objects.get(material=material, pricing_tab=pricing_tab)
            price = material_price.price
            original_price = getattr(material_price, 'original_price', price)
        except MaterialPrice.DoesNotExist:
            raise ValueError(f"جنس {material} برای این محصول نیست")

        size_obj = None
        size_display_str = "بدون سایز"
        if size_id:
            try:
                size_obj = Size.objects.get(id=size_id)
                size_display_str = str(size_obj)
            except Size.DoesNotExist:
                raise ValueError("این سایز وجود ندارد.")

        id_unique = self.unique_code(product_id, pricing_tab_id, size_id, material)

        if id_unique not in self.cart:
            self.cart[id_unique] = {
                "quantity": quantity,
                "size": size_id,
                "size_display": size_display_str,
                "material": material,
                "product_id": product_id,
                "product_name": product.title,
                "pricing_tab_id": pricing_tab.id,
                "pricing_tab_service": pricing_tab.tab_name,
                "price": str(price),
                "original_price": str(original_price),
            }
        else:
            self.cart[id_unique]["quantity"] += quantity

        self.session["cart"] = self.cart
        self.session.modified = True

    def remove_cart(self, id_unique):
        if id_unique in self.cart:
            if self.cart[id_unique]["quantity"] > 1:
                self.cart[id_unique]["quantity"] -= 1
            else:
                del self.cart[id_unique]
            self.session.modified = True

    def delete_item(self, id_unique):
        if id_unique in self.cart:
            del self.cart[id_unique]
            self.session.modified = True
            return True
        return False

    def update_quantity(self, id_unique, quantity):
        if id_unique in self.cart:
            if quantity > 0:
                self.cart[id_unique]['quantity'] = quantity
            else:
                del self.cart[id_unique]
            self.session.modified = True
            return True
        return False

    def total_price(self):
        total = 0
        for item in self:
            total += item["total_price"]
        return total

    def clear(self):
        self.session["cart"] = {}
        self.session.modified = True