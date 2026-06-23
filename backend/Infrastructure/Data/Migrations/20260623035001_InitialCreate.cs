using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var isSqlServer = ActiveProvider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase);

            migrationBuilder.CreateTable(
                name: "TaskItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: isSqlServer ? "uniqueidentifier" : "TEXT", nullable: false),
                    Title = table.Column<string>(type: isSqlServer ? "nvarchar(200)" : "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: isSqlServer ? "nvarchar(1000)" : "TEXT", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: isSqlServer ? "nvarchar(50)" : "TEXT", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: isSqlServer ? "datetimeoffset" : "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: isSqlServer ? "datetimeoffset" : "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskItems", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskItems");
        }
    }
}
