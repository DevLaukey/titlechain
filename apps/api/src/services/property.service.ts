import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { generateTitleNumber } from "@title-chain/shared";

const prisma = new PrismaClient();

export interface CreatePropertyInput {
  ownerId: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  landArea?: number;
  landAreaUnit?: string;
  propertyType: string;
  estimatedValue?: number;
}

export interface UpdatePropertyInput {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  landArea?: number;
  landAreaUnit?: string;
  propertyType?: string;
  estimatedValue?: number;
  metadataHash?: string;
}

export interface ListPropertiesOptions {
  page?: number;
  limit?: number;
  status?: string;
  ownerId?: string;
  city?: string;
  country?: string;
}

export const propertyService = {
  async createProperty(input: CreatePropertyInput) {
    const titleNumber = generateTitleNumber(input.state);

    const existing = await prisma.property.findUnique({
      where: { titleNumber },
    });

    const finalTitleNumber = existing
      ? generateTitleNumber(input.state)
      : titleNumber;

    const property = await prisma.property.create({
      data: {
        titleNumber: finalTitleNumber,
        ownerId: input.ownerId,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        landArea: input.landArea,
        landAreaUnit: input.landAreaUnit,
        propertyType: input.propertyType,
        estimatedValue: input.estimatedValue,
        status: "DRAFT" as never,
      },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        documents: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Property",
        entityId: property.id,
        action: "PROPERTY_CREATED",
        actorId: input.ownerId,
        propertyId: property.id,
        metadata: { titleNumber: property.titleNumber },
      },
    });

    return property;
  },

  async listProperties(options: ListPropertiesOptions = {}) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    if (options.ownerId) where.ownerId = options.ownerId;
    if (options.city) where.city = { contains: options.city, mode: "insensitive" };
    if (options.country) where.country = options.country;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause = where as any;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: { select: { documents: true } },
        },
      }),
      prisma.property.count({ where: whereClause }),
    ]);

    return {
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getPropertyById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            walletAddress: true,
          },
        },
        documents: true,
        transactions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            buyer: { select: { id: true, email: true } },
            seller: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    return property;
  },

  async updateProperty(
    id: string,
    requesterId: string,
    input: UpdatePropertyInput
  ) {
    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    if (property.ownerId !== requesterId) {
      throw new AppError("You do not own this property", 403);
    }

    const immutableStatuses = ["TRANSFERRED", "REJECTED"];
    if (immutableStatuses.includes(property.status as string)) {
      throw new AppError(
        `Cannot update a property with status: ${property.status}`,
        400
      );
    }

    const updateData: Record<string, unknown> = {};
    if (input.address) updateData.address = input.address;
    if (input.city) updateData.city = input.city;
    if (input.state) updateData.state = input.state;
    if (input.country) updateData.country = input.country;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode;
    if (input.landArea !== undefined) updateData.landArea = input.landArea;
    if (input.landAreaUnit !== undefined) updateData.landAreaUnit = input.landAreaUnit;
    if (input.propertyType) updateData.propertyType = input.propertyType;
    if (input.estimatedValue !== undefined) updateData.estimatedValue = input.estimatedValue;
    if (input.metadataHash) updateData.metadataHash = input.metadataHash;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.property.update({
      where: { id },
      data: updateData as any,
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        documents: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Property",
        entityId: id,
        action: "PROPERTY_UPDATED",
        actorId: requesterId,
        propertyId: id,
        metadata: input as never,
      },
    });

    return updated;
  },
};
