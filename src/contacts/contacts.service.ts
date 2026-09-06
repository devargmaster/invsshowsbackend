import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Contact, ContactRole } from '@prisma/client';

interface EnsureForUserOptions {
  email?: string | null;
  fullName?: string | null;
  // "web_signup", "google_signup", "backfill_user_existente", etc. — de
  // dónde salió este contacto, ver Contact.source en schema.prisma.
  source: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  // Se llama cada vez que se crea o resuelve un User (registro, alta por
  // Google) para que nunca quede un User sin su Contact espejo. Idempotente:
  // si el User ya tiene Contact, lo devuelve tal cual.
  //
  // Si ya existía un Contact "suelto" con el mismo email (ej. un prospecto
  // cargado antes desde WhatsApp/Instagram, sin cuenta todavía), lo vincula
  // en vez de crear un duplicado — es la resolución de identidad que pide
  // el diseño de INVS Core Data: un mismo email nunca debería terminar en
  // dos Contact distintos.
  async ensureForUser(userId: string, opts: EnsureForUserOptions): Promise<Contact> {
    const existingForUser = await this.prisma.contact.findUnique({ where: { userId } });
    if (existingForUser) return existingForUser;

    if (opts.email) {
      const existingByEmail = await this.prisma.contact.findUnique({ where: { email: opts.email } });
      if (existingByEmail && !existingByEmail.userId) {
        return this.prisma.contact.update({
          where: { id: existingByEmail.id },
          data: {
            userId,
            fullName: existingByEmail.fullName ?? opts.fullName ?? undefined,
            roleAssignments: {
              connectOrCreate: {
                where: { contactId_role: { contactId: existingByEmail.id, role: ContactRole.FAN } },
                create: { role: ContactRole.FAN },
              },
            },
          },
        });
      }
    }

    return this.prisma.contact.create({
      data: {
        userId,
        email: opts.email ?? undefined,
        fullName: opts.fullName ?? undefined,
        source: opts.source,
        roleAssignments: { create: { role: ContactRole.FAN } },
      },
    });
  }

  // La "vista 360" (INVS Graph): todo lo que un contacto es y compró, en un
  // solo objeto. Si el contacto todavía no tiene User (prospecto puro,
  // capturado antes de registrarse) no hay compras/tickets que traer todavía.
  async getGraph(contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { roleAssignments: { orderBy: { since: 'asc' } } },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado.');

    const roles = contact.roleAssignments.map((assignment) => ({
      role: assignment.role,
      since: assignment.since,
    }));

    const base = {
      contact: {
        id: contact.id,
        email: contact.email,
        phone: contact.phone,
        fullName: contact.fullName,
        source: contact.source,
        createdAt: contact.createdAt,
      },
      roles,
    };

    if (!contact.userId) {
      return { ...base, identity: null, subscription: null, eventsAttended: [], purchases: { orders: [], content: [], store: [] } };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: contact.userId },
      include: {
        subscription: true,
        ordersAsBuyer: {
          orderBy: { createdAt: 'desc' },
          include: {
            event: { select: { id: true, title: true, date: true } },
            tickets: { select: { id: true, status: true, categoryId: true } },
          },
        },
        ticketsHeld: {
          select: { id: true, status: true, event: { select: { id: true, title: true, date: true } } },
        },
        contentPurchases: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            priceCents: true,
            currency: true,
            paidAt: true,
            recording: { select: { id: true, title: true } },
            event: { select: { id: true, title: true } },
          },
        },
        storePurchases: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            quantity: true,
            priceCents: true,
            addon: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Defensivo: Contact.userId tiene onDelete SetNull, así que este caso no
    // debería darse en la práctica, pero preferimos no romper la vista 360
    // si algún día pasa.
    if (!user) {
      return { ...base, identity: null, subscription: null, eventsAttended: [], purchases: { orders: [], content: [], store: [] } };
    }

    return {
      ...base,
      identity: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt },
      subscription: user.subscription,
      eventsAttended: user.ticketsHeld,
      purchases: {
        orders: user.ordersAsBuyer,
        content: user.contentPurchases,
        store: user.storePurchases,
      },
    };
  }

  async getGraphByUserId(userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { userId } });
    if (!contact) throw new NotFoundException('Este usuario todavía no tiene un Contact asociado.');
    return this.getGraph(contact.id);
  }
}
