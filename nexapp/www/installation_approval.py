import frappe

no_cache = 1
allow_guest = True

def get_context(context):
    context.no_cache = 1
    context.show_sidebar = False
    context.parents = []
